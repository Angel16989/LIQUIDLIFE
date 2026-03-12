from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.crypto import get_random_string

from .models import PasswordResetRequest


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


def generate_unique_username(base_value: str) -> str:
    normalized = "".join(char for char in base_value.lower() if char.isalnum() or char == "_").strip("_")
    candidate = normalized or "user"
    suffix = 1

    while User.objects.filter(username=candidate).exists():
        candidate = f"{normalized or 'user'}{suffix}"
        suffix += 1

    return candidate
