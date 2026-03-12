from django.urls import path

from .views import (
    AdminEngagementAPIView,
    AdminUserDeleteAPIView,
    AdminUserPasswordAPIView,
    AuthorizationRequestDecisionAPIView,
    ForgotPasswordAPIView,
    GoogleLoginAPIView,
    LoginAPIView,
    RegisterAPIView,
    ResetPasswordAPIView,
)

urlpatterns = [
    path("register", RegisterAPIView.as_view(), name="auth-register"),
    path("login", LoginAPIView.as_view(), name="auth-login"),
    path("google-login", GoogleLoginAPIView.as_view(), name="auth-google-login"),
    path("forgot-password", ForgotPasswordAPIView.as_view(), name="auth-forgot-password"),
    path("reset-password", ResetPasswordAPIView.as_view(), name="auth-reset-password"),
    path("admin/engagement", AdminEngagementAPIView.as_view(), name="auth-admin-engagement"),
    path("users/<int:id>", AdminUserDeleteAPIView.as_view(), name="auth-admin-user-delete"),
    path("users/<int:id>/password", AdminUserPasswordAPIView.as_view(), name="auth-admin-user-password"),
    path(
        "authorization-requests/<int:id>/decision",
        AuthorizationRequestDecisionAPIView.as_view(),
        name="auth-authorization-request-decision",
    ),
]
