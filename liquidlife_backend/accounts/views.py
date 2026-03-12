from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from jobs.models import Document, Job

from .models import AccountAuthorizationRequest, PasswordResetRequest
from .services import (
    create_password_reset_request,
    generate_temporary_password,
    generate_unique_username,
    get_valid_password_reset_request,
    send_password_reset_email,
    verify_google_credential,
)
from .serializers import (
    AccountAuthorizationRequestSerializer,
    AdminSetPasswordSerializer,
    AdminUserSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
)

ADMIN_USERNAME = getattr(settings, "LIQUIDLIFE_ADMIN_USERNAME", "LIQUIDLIFEADMIN")
ADMIN_PASSWORD = getattr(settings, "LIQUIDLIFE_ADMIN_PASSWORD", "WELCOME@123")
FRONTEND_BASE_URL = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000")


def mark_user_login(user: User):
    user.last_login = timezone.now()
    user.save(update_fields=["last_login"])


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                "detail": "Registration submitted. Wait for admin approval before login.",
                "username": user.username,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]

        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            admin_user, _ = User.objects.get_or_create(
                username=ADMIN_USERNAME,
                defaults={"is_staff": True, "is_superuser": True, "is_active": True},
            )
            admin_user.is_staff = True
            admin_user.is_superuser = True
            admin_user.is_active = True
            admin_user.set_password(ADMIN_PASSWORD)
            admin_user.save(
                update_fields=["is_staff", "is_superuser", "is_active", "password"]
            )
            mark_user_login(admin_user)
            refresh = RefreshToken.for_user(admin_user)
            return Response(
                {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "is_admin": True,
                    "username": admin_user.username,
                },
                status=status.HTTP_200_OK,
            )

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
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "is_admin": user.is_staff or user.is_superuser,
                "username": user.username,
            },
            status=status.HTTP_200_OK,
        )


class GoogleLoginAPIView(APIView):
    permission_classes = [AllowAny]

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
            return Response(
                {"detail": "Google account registered. Wait for admin approval before login."},
                status=status.HTTP_403_FORBIDDEN,
            )

        auth_request = getattr(user, "authorization_request", None)
        if auth_request and auth_request.status == AccountAuthorizationRequest.Status.PENDING:
            return Response({"detail": "Account pending admin approval."}, status=status.HTTP_403_FORBIDDEN)
        if auth_request and auth_request.status == AccountAuthorizationRequest.Status.REJECTED:
            return Response({"detail": "Account access rejected by admin."}, status=status.HTTP_403_FORBIDDEN)
        if not user.is_active:
            return Response({"detail": "Account is inactive."}, status=status.HTTP_403_FORBIDDEN)

        mark_user_login(user)
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "is_admin": user.is_staff or user.is_superuser,
                "username": user.username,
            },
            status=status.HTTP_200_OK,
        )


class ForgotPasswordAPIView(APIView):
    permission_classes = [AllowAny]

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

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reset_request = get_valid_password_reset_request(serializer.validated_data["token"])
        if reset_request is None:
            return Response({"detail": "This reset link is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)

        user = reset_request.user
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password"])

        reset_request.used_at = timezone.now()
        reset_request.save(update_fields=["used_at"])

        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)


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
        users = User.objects.select_related("authorization_request").order_by("-date_joined", "-id")
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


class AuthorizationRequestDecisionAPIView(APIView):
    permission_classes = [IsAdminUser]

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

        new_status = (
            AccountAuthorizationRequest.Status.APPROVED
            if decision == "approved"
            else AccountAuthorizationRequest.Status.REJECTED
        )
        auth_request.status = new_status
        auth_request.note = note
        auth_request.reviewed_by = request.user
        auth_request.reviewed_at = timezone.now()
        auth_request.save(update_fields=["status", "note", "reviewed_by", "reviewed_at", "updated_at"])

        user = auth_request.user
        user.is_active = new_status == AccountAuthorizationRequest.Status.APPROVED
        user.save(update_fields=["is_active"])

        return Response(
            AccountAuthorizationRequestSerializer(auth_request).data,
            status=status.HTTP_200_OK,
        )


class AdminUserDeleteAPIView(APIView):
    permission_classes = [IsAdminUser]

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

        return Response(
            {
                "detail": "Password updated successfully.",
                "generated_password": generated_password,
            },
            status=status.HTTP_200_OK,
        )
