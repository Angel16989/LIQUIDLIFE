from __future__ import annotations

import base64
import json
import logging
from datetime import timedelta
from urllib import error, parse, request

from django.conf import settings
from django.contrib.auth.models import User
from django.core import signing
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.crypto import get_random_string

from .models import AccountAuthorizationRequest, PasswordResetRequest

logger = logging.getLogger(__name__)
AUTHORIZATION_EMAIL_ACTION_SALT = "accounts.authorization-email-action"
EMAIL_VERIFICATION_SALT = "accounts.email-verification"
TWILIO_VERIFY_API_BASE = "https://verify.twilio.com/v2/Services"


class PhoneVerificationConfigurationError(Exception):
    pass


class PhoneVerificationError(Exception):
    pass


def create_password_reset_request(user: User) -> PasswordResetRequest:
    PasswordResetRequest.objects.filter(user=user, used_at__isnull=True).delete()
    return PasswordResetRequest.objects.create(
        user=user,
        token=get_random_string(48),
        expires_at=timezone.now() + timedelta(hours=1),
    )


def send_password_reset_email(user: User, reset_request: PasswordResetRequest):
    reset_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/reset-password?token={reset_request.token}"
    send_mail(
        subject="Liquid Life password reset",
        message=(
            f"Use this link to reset your Liquid Life password:\n\n{reset_url}\n\n"
            "This link expires in 1 hour."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def build_authorization_email_action_token(auth_request: AccountAuthorizationRequest, decision: str) -> str:
    return signing.dumps(
        {
            "authorization_request_id": auth_request.id,
            "decision": decision,
        },
        salt=AUTHORIZATION_EMAIL_ACTION_SALT,
    )


def resolve_authorization_email_action_token(token: str) -> tuple[AccountAuthorizationRequest | None, str | None]:
    if not token:
        return None, None

    max_age = getattr(settings, "AUTHORIZATION_EMAIL_ACTION_MAX_AGE_SECONDS", 604800)
    try:
        payload = signing.loads(token, salt=AUTHORIZATION_EMAIL_ACTION_SALT, max_age=max_age)
    except signing.BadSignature:
        return None, None
    except signing.SignatureExpired:
        return None, None

    auth_request_id = payload.get("authorization_request_id")
    decision = payload.get("decision")
    if not isinstance(auth_request_id, int) or decision not in {"approved", "rejected"}:
        return None, None

    auth_request = AccountAuthorizationRequest.objects.select_related("user").filter(id=auth_request_id).first()
    return auth_request, decision


def build_email_verification_token(user: User) -> str:
    return signing.dumps({"user_id": user.id}, salt=EMAIL_VERIFICATION_SALT)


def resolve_email_verification_token(token: str) -> User | None:
    if not token:
        return None

    max_age = getattr(settings, "EMAIL_VERIFICATION_MAX_AGE_SECONDS", 604800)
    try:
        payload = signing.loads(token, salt=EMAIL_VERIFICATION_SALT, max_age=max_age)
    except signing.BadSignature:
        return None
    except signing.SignatureExpired:
        return None

    user_id = payload.get("user_id")
    if not isinstance(user_id, int):
        return None

    return User.objects.filter(id=user_id).first()


def send_registration_received_email(user: User):
    if not user.email:
        return

    send_mail(
        subject="Liquid Life registration received",
        message=(
            f"Hi {user.username},\n\n"
            "Your Liquid Life account request has been received and is waiting for admin approval.\n"
            "You will receive another email once your access is approved or rejected."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_email_verification_email(user: User, verification_url: str):
    if not user.email:
        return

    send_mail(
        subject="Verify your Liquid Life email",
        message=(
            f"Hi {user.username},\n\n"
            "Use this link to verify your email for Liquid Life:\n\n"
            f"{verification_url}\n\n"
            "You will still need admin approval before full access is available."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_admin_authorization_request_email(
    auth_request: AccountAuthorizationRequest,
    *,
    approve_url: str,
    reject_url: str,
):
    recipient_list = list(getattr(settings, "LIQUIDLIFE_ADMIN_NOTIFICATION_EMAILS", []))
    if not recipient_list:
        return

    user = auth_request.user
    send_mail(
        subject=f"Liquid Life approval required: {user.username}",
        message=(
            "A new Liquid Life account is waiting for approval.\n\n"
            f"Username: {user.username}\n"
            f"Email: {user.email or 'Not provided'}\n"
            f"Requested at: {auth_request.created_at.isoformat()}\n\n"
            f"Approve: {approve_url}\n"
            f"Reject: {reject_url}\n"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipient_list,
        fail_silently=False,
    )


def send_authorization_status_email(user: User, decision: str):
    if not user.email:
        return

    if decision == "approved":
        subject = "Liquid Life account approved"
        message = (
            f"Hi {user.username},\n\n"
            "Your Liquid Life account has been approved.\n"
            f"You can now sign in at {settings.FRONTEND_BASE_URL.rstrip('/')}/login"
        )
    else:
        subject = "Liquid Life account rejected"
        message = (
            f"Hi {user.username},\n\n"
            "Your Liquid Life account request was rejected.\n"
            "If this looks wrong, contact the admin directly."
        )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def is_google_email_authoritative(claims: dict) -> bool:
    email = str(claims.get("email", "")).strip().lower()
    if not email:
        return False

    if email.endswith("@gmail.com"):
        return True

    return bool(claims.get("email_verified")) and bool(claims.get("hd"))


def get_valid_password_reset_request(token: str) -> PasswordResetRequest | None:
    reset_request = PasswordResetRequest.objects.select_related("user").filter(token=token).first()
    if reset_request is None or reset_request.used_at is not None or reset_request.is_expired:
        return None
    return reset_request


def generate_temporary_password(length: int = 14) -> str:
    return get_random_string(length)


def verify_google_credential(credential: str) -> dict:
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    client_id = settings.GOOGLE_OAUTH_CLIENT_ID
    if not client_id:
        raise ValueError("Google login is not configured.")

    return id_token.verify_oauth2_token(
        credential,
        google_requests.Request(),
        client_id,
    )


def _require_twilio_verify_config() -> tuple[str, str, str]:
    account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    service_sid = getattr(settings, "TWILIO_VERIFY_SERVICE_SID", "")
    if not account_sid or not auth_token or not service_sid:
        raise PhoneVerificationConfigurationError("Phone verification is not configured.")
    return account_sid, auth_token, service_sid


def start_phone_verification(phone_number: str) -> dict:
    account_sid, auth_token, service_sid = _require_twilio_verify_config()
    body = parse.urlencode({"To": phone_number, "Channel": "sms"}).encode("utf-8")
    req = request.Request(
        f"{TWILIO_VERIFY_API_BASE}/{service_sid}/Verifications",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Basic {base64.b64encode(f'{account_sid}:{auth_token}'.encode()).decode()}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    try:
        with request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise PhoneVerificationError(detail or f"Phone verification start failed with status {exc.code}.") from exc
    except error.URLError as exc:
        raise PhoneVerificationError("Phone verification service could not be reached.") from exc


def check_phone_verification(phone_number: str, code: str) -> dict:
    account_sid, auth_token, service_sid = _require_twilio_verify_config()
    body = parse.urlencode({"To": phone_number, "Code": code}).encode("utf-8")
    req = request.Request(
        f"{TWILIO_VERIFY_API_BASE}/{service_sid}/VerificationCheck",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Basic {base64.b64encode(f'{account_sid}:{auth_token}'.encode()).decode()}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    try:
        with request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise PhoneVerificationError(detail or f"Phone verification check failed with status {exc.code}.") from exc
    except error.URLError as exc:
        raise PhoneVerificationError("Phone verification service could not be reached.") from exc


def generate_unique_username(base_value: str) -> str:
    normalized = "".join(char for char in base_value.lower() if char.isalnum() or char == "_").strip("_")
    candidate = normalized or "user"
    suffix = 1

    while User.objects.filter(username=candidate).exists():
        candidate = f"{normalized or 'user'}{suffix}"
        suffix += 1

    return candidate


def notify_registration_pending(
    auth_request: AccountAuthorizationRequest,
    *,
    approve_url: str,
    reject_url: str,
    verification_url: str,
):
    try:
        send_registration_received_email(auth_request.user)
    except Exception:
        logger.exception("Failed to send registration received email for user %s", auth_request.user_id)

    try:
        send_email_verification_email(auth_request.user, verification_url)
    except Exception:
        logger.exception("Failed to send email verification email for user %s", auth_request.user_id)

    try:
        send_admin_authorization_request_email(
            auth_request,
            approve_url=approve_url,
            reject_url=reject_url,
        )
    except Exception:
        logger.exception("Failed to send admin authorization email for request %s", auth_request.id)


def notify_authorization_status(user: User, decision: str):
    try:
        send_authorization_status_email(user, decision)
    except Exception:
        logger.exception("Failed to send authorization status email for user %s", user.id)
