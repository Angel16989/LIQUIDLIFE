from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from jobs.models import Document, Job

from .models import AccountAuthorizationRequest
from .serializers import (
    AccountAuthorizationRequestSerializer,
    LoginSerializer,
    RegisterSerializer,
)

ADMIN_USERNAME = getattr(settings, "LIQUIDLIFE_ADMIN_USERNAME", "LIQUIDLIFEADMIN")
ADMIN_PASSWORD = getattr(settings, "LIQUIDLIFE_ADMIN_PASSWORD", "WELCOME@123")


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                "detail": "Registration successful.",
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

        data = {
            "engagement": {
                "total_users": total_users,
                "active_users": active_users,
                "pending_authorization_requests": pending_requests_count,
                "jobs_tracked": Job.objects.count(),
                "documents_uploaded": Document.objects.count(),
            },
            "authorization_requests": requests_data,
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
