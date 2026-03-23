from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminEngagementAPIView,
    AdminUserCreateAPIView,
    AdminUserDeleteAPIView,
    AdminUserPasswordAPIView,
    AuthorizationRequestDecisionAPIView,
    AuthorizationRequestEmailActionAPIView,
    ChangePasswordAPIView,
    CheckPhoneVerificationAPIView,
    ForgotPasswordAPIView,
    GoogleLoginAPIView,
    LoginAPIView,
    RegisterAPIView,
    ResetPasswordAPIView,
    SendEmailVerificationAPIView,
    StartPhoneVerificationAPIView,
    VerificationStatusAPIView,
    VerifyEmailAPIView,
)

urlpatterns = [
    path("register", RegisterAPIView.as_view(), name="auth-register"),
    path("login", LoginAPIView.as_view(), name="auth-login"),
    path("refresh", TokenRefreshView.as_view(), name="auth-refresh"),
    path("google-login", GoogleLoginAPIView.as_view(), name="auth-google-login"),
    path("forgot-password", ForgotPasswordAPIView.as_view(), name="auth-forgot-password"),
    path("reset-password", ResetPasswordAPIView.as_view(), name="auth-reset-password"),
    path("change-password", ChangePasswordAPIView.as_view(), name="auth-change-password"),
    path("verification-status", VerificationStatusAPIView.as_view(), name="auth-verification-status"),
    path("send-email-verification", SendEmailVerificationAPIView.as_view(), name="auth-send-email-verification"),
    path("verify-email", VerifyEmailAPIView.as_view(), name="auth-email-verify"),
    path("phone/start", StartPhoneVerificationAPIView.as_view(), name="auth-phone-start"),
    path("phone/check", CheckPhoneVerificationAPIView.as_view(), name="auth-phone-check"),
    path("admin/engagement", AdminEngagementAPIView.as_view(), name="auth-admin-engagement"),
    path("users", AdminUserCreateAPIView.as_view(), name="auth-admin-user-create"),
    path("users/<int:id>", AdminUserDeleteAPIView.as_view(), name="auth-admin-user-delete"),
    path("users/<int:id>/password", AdminUserPasswordAPIView.as_view(), name="auth-admin-user-password"),
    path(
        "authorization-requests/<int:id>/decision",
        AuthorizationRequestDecisionAPIView.as_view(),
        name="auth-authorization-request-decision",
    ),
    path(
        "authorization-requests/email-action",
        AuthorizationRequestEmailActionAPIView.as_view(),
        name="auth-authorization-request-email-action",
    ),
]
