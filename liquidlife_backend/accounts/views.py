from django.conf import settings
from django.contrib.auth.models import User
from django.http import HttpResponse
from django.urls import reverse
from django.utils.html import escape
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from jobs.models import Document, Job

from .models import AccountAuthorizationRequest, PasswordResetRequest, UserSecurityState
from .services import (
    PhoneVerificationConfigurationError,
    PhoneVerificationError,
    build_authorization_email_action_token,
    build_email_verification_token,
    check_phone_verification,
    create_password_reset_request,
    generate_temporary_password,
    generate_unique_username,
    get_valid_password_reset_request,
    is_google_email_authoritative,
    notify_authorization_status,
    notify_registration_pending,
    resolve_authorization_email_action_token,
    resolve_email_verification_token,
    send_email_verification_email,
    start_phone_verification,
    send_password_reset_email,
    verify_google_credential,
)
from .serializers import (
    AccountAuthorizationRequestSerializer,
    AdminCreateUserSerializer,
    AdminSetPasswordSerializer,
    AdminUserSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    PhoneVerificationCheckSerializer,
    PhoneVerificationStartSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    SendEmailVerificationSerializer,
    VerificationStatusSerializer,
)

ADMIN_USERNAME = getattr(settings, "LIQUIDLIFE_ADMIN_USERNAME", "LIQUIDLIFEADMIN")
ADMIN_PASSWORD = getattr(settings, "LIQUIDLIFE_ADMIN_PASSWORD", "")
FRONTEND_BASE_URL = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000")


def mark_user_login(user: User):
    user.last_login = timezone.now()
    user.save(update_fields=["last_login"])


def get_or_create_security_state(user: User) -> UserSecurityState:
    security_state = getattr(user, "security_state", None)
    if security_state is not None:
        return security_state
    security_state, _ = UserSecurityState.objects.get_or_create(user=user)
    return security_state


def must_change_password(user: User) -> bool:
    security_state = getattr(user, "security_state", None)
    if security_state is None:
        return False
    return bool(security_state.must_change_password)


def is_email_verified(user: User) -> bool:
    security_state = getattr(user, "security_state", None)
    return bool(security_state and security_state.email_verified_at)


def is_phone_verified(user: User) -> bool:
    security_state = getattr(user, "security_state", None)
    return bool(security_state and security_state.phone_verified_at)


def is_phone_verification_configured() -> bool:
    return bool(
        getattr(settings, "TWILIO_ACCOUNT_SID", "")
        and getattr(settings, "TWILIO_AUTH_TOKEN", "")
        and getattr(settings, "TWILIO_VERIFY_SERVICE_SID", "")
    )


def build_verification_status_payload(user: User) -> dict:
    security_state = get_or_create_security_state(user)
    return {
        "email": user.email or "",
        "email_verified": bool(security_state.email_verified_at),
        "phone_number": security_state.phone_number or "",
        "phone_verified": bool(security_state.phone_verified_at),
        "phone_verification_configured": is_phone_verification_configured(),
        "verification_required": bool(getattr(settings, "ACCOUNT_VERIFICATION_REQUIRED", False)),
        "verification_notice_enabled": bool(getattr(settings, "ACCOUNT_VERIFICATION_NOTICE_ENABLED", True)),
    }


def get_or_create_admin_actor() -> User:
    admin_user, _ = User.objects.get_or_create(
        username=ADMIN_USERNAME,
        defaults={"is_staff": True, "is_superuser": True, "is_active": True},
    )
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.is_active = True
    if ADMIN_PASSWORD:
        admin_user.set_password(ADMIN_PASSWORD)
        admin_user.save(update_fields=["is_staff", "is_superuser", "is_active", "password"])
    else:
        admin_user.save(update_fields=["is_staff", "is_superuser", "is_active"])
    return admin_user


def build_authorization_email_urls(request, auth_request: AccountAuthorizationRequest) -> tuple[str, str]:
    approve_token = build_authorization_email_action_token(
        auth_request,
        AccountAuthorizationRequest.Status.APPROVED,
    )
    reject_token = build_authorization_email_action_token(
        auth_request,
        AccountAuthorizationRequest.Status.REJECTED,
    )
    approve_url = request.build_absolute_uri(
        f"{reverse('auth-authorization-request-email-action')}?token={approve_token}"
    )
    reject_url = request.build_absolute_uri(
        f"{reverse('auth-authorization-request-email-action')}?token={reject_token}"
    )
    return approve_url, reject_url


def build_email_verification_url(request, user: User) -> str:
    token = build_email_verification_token(user)
    return request.build_absolute_uri(f"{reverse('auth-email-verify')}?token={token}")


def build_session_response(user: User) -> Response:
    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "is_admin": user.is_staff or user.is_superuser,
            "username": user.username,
            "must_change_password": must_change_password(user),
            **build_verification_status_payload(user),
        },
        status=status.HTTP_200_OK,
    )


def apply_authorization_decision(
    auth_request: AccountAuthorizationRequest,
    *,
    decision: str,
    reviewed_by: User | None,
    note: str = "",
):
    new_status = (
        AccountAuthorizationRequest.Status.APPROVED
        if decision == AccountAuthorizationRequest.Status.APPROVED
        else AccountAuthorizationRequest.Status.REJECTED
    )
    auth_request.status = new_status
    auth_request.note = note
    auth_request.reviewed_by = reviewed_by
    auth_request.reviewed_at = timezone.now()
    auth_request.save(update_fields=["status", "note", "reviewed_by", "reviewed_at", "updated_at"])

    user = auth_request.user
    user.is_active = new_status == AccountAuthorizationRequest.Status.APPROVED
    user.save(update_fields=["is_active"])
    notify_authorization_status(user, decision)
    return auth_request


def render_email_action_result(title: str, message: str, decision: str | None = None) -> HttpResponse:
    accent = "#0f766e" if decision == "approved" else "#b91c1c" if decision == "rejected" else "#334155"
    safe_title = escape(title)
    safe_message = escape(message)
    html = f"""
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{safe_title}</title>
        <style>
          body {{
            margin: 0;
            font-family: system-ui, sans-serif;
            background: #f4f7fb;
            color: #1e293b;
            display: grid;
            place-items: center;
            min-height: 100vh;
            padding: 24px;
          }}
          .card {{
            max-width: 560px;
            width: 100%;
            background: white;
            border: 1px solid #d8e1ef;
            border-top: 8px solid {accent};
            border-radius: 18px;
            box-shadow: 0 24px 56px rgba(30, 41, 59, 0.12);
            padding: 28px;
          }}
          h1 {{ margin: 0 0 12px; font-size: 28px; }}
          p {{ margin: 0; line-height: 1.6; }}
          a {{
            display: inline-block;
            margin-top: 18px;
            color: white;
            background: {accent};
            padding: 10px 14px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
          }}
        </style>
      </head>
      <body>
        <main class="card">
          <h1>{safe_title}</h1>
          <p>{safe_message}</p>
          <a href="{FRONTEND_BASE_URL.rstrip('/')}/login">Open Liquid Life</a>
        </main>
      </body>
    </html>
    """
    return HttpResponse(html)


class ThrottledTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    throttle_scope = "auth_refresh"


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth_register"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        approve_url, reject_url = build_authorization_email_urls(request, user.authorization_request)
        verification_url = build_email_verification_url(request, user)
        notify_registration_pending(
            user.authorization_request,
            approve_url=approve_url,
            reject_url=reject_url,
            verification_url=verification_url,
        )

        return Response(
            {
                "detail": "Registration submitted. Wait for admin approval before login.",
                "username": user.username,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth_login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]

        if ADMIN_PASSWORD and username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            admin_user = get_or_create_admin_actor()
            mark_user_login(admin_user)
            return build_session_response(admin_user)

        user = User.objects.filter(username=username).first()
        if user is None or not user.check_password(password):
            return Response({"detail": "Invalid username or password."}, status=status.HTTP_401_UNAUTHORIZED)

        auth_request = getattr(user, "authorization_request", None)
        if auth_request and auth_request.status == AccountAuthorizationRequest.Status.PENDING:
            return Response(
                {
                    "detail": "Account pending admin approval.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        if auth_request and auth_request.status == AccountAuthorizationRequest.Status.REJECTED:
            return Response(
                {
                    "detail": "Account access rejected by admin.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        if not user.is_active:
            return Response(
                {
                    "detail": "Account is inactive.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        mark_user_login(user)
        return build_session_response(user)


class GoogleLoginAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth_google_login"

    def post(self, request):
        credential = str(request.data.get("credential", "")).strip()
        if not credential:
            return Response({"detail": "Missing Google credential."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            claims = verify_google_credential(credential)
        except ValueError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({"detail": "Google credential verification failed."}, status=status.HTTP_401_UNAUTHORIZED)

        email = str(claims.get("email", "")).strip().lower()
        if not email:
            return Response({"detail": "Google account email is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        email_authoritative = is_google_email_authoritative(claims)
        if user is None:
            base_username = str(claims.get("given_name") or email.split("@")[0] or "user")
            user = User.objects.create_user(
                username=generate_unique_username(base_username),
                email=email,
                password=generate_temporary_password(24),
                is_active=False,
            )
            AccountAuthorizationRequest.objects.create(
                user=user,
                status=AccountAuthorizationRequest.Status.PENDING,
            )
            if email_authoritative:
                security_state = get_or_create_security_state(user)
                security_state.email_verified_at = timezone.now()
                security_state.save(update_fields=["email_verified_at", "updated_at"])
            approve_url, reject_url = build_authorization_email_urls(request, user.authorization_request)
            verification_url = build_email_verification_url(request, user)
            notify_registration_pending(
                user.authorization_request,
                approve_url=approve_url,
                reject_url=reject_url,
                verification_url=verification_url,
            )
            return Response(
                {"detail": "Google account registered. Wait for admin approval before login."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if email_authoritative and not is_email_verified(user):
            security_state = get_or_create_security_state(user)
            security_state.email_verified_at = timezone.now()
            security_state.save(update_fields=["email_verified_at", "updated_at"])

        auth_request = getattr(user, "authorization_request", None)
        if auth_request and auth_request.status == AccountAuthorizationRequest.Status.PENDING:
            return Response({"detail": "Account pending admin approval."}, status=status.HTTP_403_FORBIDDEN)
        if auth_request and auth_request.status == AccountAuthorizationRequest.Status.REJECTED:
            return Response({"detail": "Account access rejected by admin."}, status=status.HTTP_403_FORBIDDEN)
        if not user.is_active:
            return Response({"detail": "Account is inactive."}, status=status.HTTP_403_FORBIDDEN)

        mark_user_login(user)
        return build_session_response(user)


class ForgotPasswordAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth_forgot_password"

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email).first()
        debug_reset_url = None
        if user is not None and user.username != ADMIN_USERNAME and user.email:
            reset_request = create_password_reset_request(user)
            send_password_reset_email(user, reset_request)
            if settings.DEBUG:
                debug_reset_url = f"{FRONTEND_BASE_URL.rstrip('/')}/reset-password?token={reset_request.token}"

        payload = {"detail": "If an account exists for that email, a reset link has been sent."}
        if debug_reset_url:
            payload["debug_reset_url"] = debug_reset_url

        return Response(payload, status=status.HTTP_200_OK)


class ResetPasswordAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth_reset_password"

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reset_request = get_valid_password_reset_request(serializer.validated_data["token"])
        if reset_request is None:
            return Response({"detail": "This reset link is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)

        user = reset_request.user
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password"])
        security_state = get_or_create_security_state(user)
        if security_state.must_change_password:
            security_state.must_change_password = False
            security_state.save(update_fields=["must_change_password", "updated_at"])

        reset_request.used_at = timezone.now()
        reset_request.save(update_fields=["used_at"])

        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)


class VerificationStatusAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = VerificationStatusSerializer(build_verification_status_payload(request.user))
        return Response(serializer.data, status=status.HTTP_200_OK)


class SendEmailVerificationAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "auth_email_verification"

    def post(self, request):
        serializer = SendEmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        submitted_email = serializer.validated_data.get("email", "").strip().lower()

        if submitted_email:
            email_in_use = (
                User.objects.filter(email__iexact=submitted_email)
                .exclude(id=user.id)
                .exists()
            )
            if email_in_use:
                return Response({"detail": "That email address is already in use."}, status=status.HTTP_400_BAD_REQUEST)

            should_update_email = not user.email or user.email.lower() != submitted_email
            if should_update_email:
                user.email = submitted_email
                user.save(update_fields=["email"])
                security_state = get_or_create_security_state(user)
                if security_state.email_verified_at is not None:
                    security_state.email_verified_at = None
                    security_state.save(update_fields=["email_verified_at", "updated_at"])

        if is_email_verified(user):
            return Response({"detail": "Email is already verified."}, status=status.HTTP_200_OK)
        if not user.email:
            return Response({"detail": "Add an email address before requesting verification."}, status=status.HTTP_400_BAD_REQUEST)

        verification_url = build_email_verification_url(request, user)
        send_email_verification_email(user, verification_url)
        return Response(
            {
                "detail": "Verification email sent.",
                "email": user.email,
            },
            status=status.HTTP_200_OK,
        )


class VerifyEmailAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth_email_verify"

    def get(self, request):
        token = str(request.query_params.get("token", "")).strip()
        user = resolve_email_verification_token(token)
        if user is None:
            return render_email_action_result(
                "Verification Link Invalid",
                "This email verification link is invalid or expired. Sign in and request another verification email.",
            )

        security_state = get_or_create_security_state(user)
        if not security_state.email_verified_at:
            security_state.email_verified_at = timezone.now()
            security_state.save(update_fields=["email_verified_at", "updated_at"])

        return render_email_action_result(
            "Email Verified",
            "Your email has been verified. You can return to Liquid Life and complete any remaining account checks.",
            "approved",
        )


class StartPhoneVerificationAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "auth_phone_start"

    def post(self, request):
        serializer = PhoneVerificationStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            payload = start_phone_verification(serializer.validated_data["phone_number"])
        except PhoneVerificationConfigurationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except PhoneVerificationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response(
            {
                "detail": "Verification code sent.",
                "status": payload.get("status", ""),
            },
            status=status.HTTP_200_OK,
        )


class CheckPhoneVerificationAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "auth_phone_check"

    def post(self, request):
        serializer = PhoneVerificationCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone_number = serializer.validated_data["phone_number"]
        code = serializer.validated_data["code"]

        try:
            payload = check_phone_verification(phone_number, code)
        except PhoneVerificationConfigurationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except PhoneVerificationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        if payload.get("status") != "approved" or not payload.get("valid"):
            return Response({"detail": "The verification code was not accepted."}, status=status.HTTP_400_BAD_REQUEST)

        security_state = get_or_create_security_state(request.user)
        security_state.phone_number = phone_number
        security_state.phone_verified_at = timezone.now()
        security_state.save(update_fields=["phone_number", "phone_verified_at", "updated_at"])

        status_serializer = VerificationStatusSerializer(build_verification_status_payload(request.user))
        return Response(
            {
                "detail": "Phone number verified.",
                "verification": status_serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class AdminEngagementAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        pending_requests_count = AccountAuthorizationRequest.objects.filter(
            status=AccountAuthorizationRequest.Status.PENDING
        ).count()

        all_requests = AccountAuthorizationRequest.objects.select_related(
            "user", "reviewed_by"
        ).order_by("-created_at")
        requests_data = AccountAuthorizationRequestSerializer(all_requests, many=True).data
        users = User.objects.select_related("authorization_request", "security_state").order_by("-date_joined", "-id")
        users_data = AdminUserSerializer(users, many=True).data

        data = {
            "engagement": {
                "total_users": total_users,
                "active_users": active_users,
                "pending_authorization_requests": pending_requests_count,
                "jobs_tracked": Job.objects.count(),
                "documents_uploaded": Document.objects.count(),
            },
            "authorization_requests": requests_data,
            "users": users_data,
        }
        return Response(data, status=status.HTTP_200_OK)


class AdminUserCreateAPIView(APIView):
    permission_classes = [IsAdminUser]
    throttle_scope = "admin_write"

    def post(self, request):
        serializer = AdminCreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                "detail": "User created. Approval is still required before login.",
                "user": AdminUserSerializer(user).data,
                "authorization_request": AccountAuthorizationRequestSerializer(user.authorization_request).data,
            },
            status=status.HTTP_201_CREATED,
        )


class AuthorizationRequestDecisionAPIView(APIView):
    permission_classes = [IsAdminUser]
    throttle_scope = "admin_write"

    def post(self, request, id: int):
        decision = str(request.data.get("decision", "")).strip().lower()
        note = str(request.data.get("note", "")).strip()
        if decision not in {"approved", "rejected"}:
            return Response(
                {"detail": "decision must be either 'approved' or 'rejected'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        auth_request = AccountAuthorizationRequest.objects.select_related("user").filter(id=id).first()
        if auth_request is None:
            return Response({"detail": "Authorization request not found."}, status=status.HTTP_404_NOT_FOUND)

        apply_authorization_decision(
            auth_request,
            decision=decision,
            reviewed_by=request.user,
            note=note,
        )

        return Response(
            AccountAuthorizationRequestSerializer(auth_request).data,
            status=status.HTTP_200_OK,
        )


class AuthorizationRequestEmailActionAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth_email_action"

    def get(self, request):
        token = str(request.query_params.get("token", "")).strip()
        auth_request, decision = resolve_authorization_email_action_token(token)
        if auth_request is None or decision is None:
            return render_email_action_result(
                "Link Invalid",
                "This approval link is invalid or expired. Use the admin portal if you still need to review the request.",
            )

        if auth_request.status != AccountAuthorizationRequest.Status.PENDING:
            return render_email_action_result(
                "Request Already Processed",
                f"This request is already marked as {auth_request.status}.",
                auth_request.status,
            )

        admin_actor = get_or_create_admin_actor()
        apply_authorization_decision(
            auth_request,
            decision=decision,
            reviewed_by=admin_actor,
            note=f"{decision.title()} via secure email link.",
        )

        return render_email_action_result(
            f"Request {decision.title()}",
            f"{auth_request.user.username} has been {decision}. The status has been updated in Liquid Life.",
            decision,
        )


class AdminUserDeleteAPIView(APIView):
    permission_classes = [IsAdminUser]
    throttle_scope = "admin_write"

    def delete(self, request, id: int):
        user = User.objects.filter(id=id).first()
        if user is None:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if user.id == request.user.id:
            return Response({"detail": "You cannot delete the current admin session."}, status=status.HTTP_400_BAD_REQUEST)

        if user.username == ADMIN_USERNAME or user.is_staff or user.is_superuser:
            return Response({"detail": "Admin users cannot be deleted here."}, status=status.HTTP_400_BAD_REQUEST)

        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminUserPasswordAPIView(APIView):
    permission_classes = [IsAdminUser]
    throttle_scope = "admin_write"

    def post(self, request, id: int):
        user = User.objects.filter(id=id).first()
        if user is None:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if user.username == ADMIN_USERNAME or user.is_staff or user.is_superuser:
            return Response({"detail": "Admin users cannot be updated here."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = AdminSetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        generated_password = None
        if serializer.validated_data.get("generate_password", False):
            generated_password = generate_temporary_password(14)
            next_password = generated_password
        else:
            next_password = serializer.validated_data["password"]

        user.set_password(next_password)
        user.save(update_fields=["password"])
        security_state = get_or_create_security_state(user)
        security_state.must_change_password = serializer.validated_data.get("require_password_change", True)
        security_state.save(update_fields=["must_change_password", "updated_at"])

        return Response(
            {
                "detail": "Password updated successfully.",
                "generated_password": generated_password,
                "must_change_password": security_state.must_change_password,
            },
            status=status.HTTP_200_OK,
        )


class ChangePasswordAPIView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "auth_reset_password"

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        current_password = serializer.validated_data["current_password"]
        if not user.check_password(current_password):
            return Response({"detail": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password"])

        security_state = get_or_create_security_state(user)
        if security_state.must_change_password:
            security_state.must_change_password = False
            security_state.save(update_fields=["must_change_password", "updated_at"])

        return Response(
            {
                "detail": "Password changed successfully.",
                "must_change_password": False,
            },
            status=status.HTTP_200_OK,
        )


class LogoutAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth_logout"

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
        except TokenError:
            pass

        return Response({"detail": "Session cleared."}, status=status.HTTP_200_OK)
