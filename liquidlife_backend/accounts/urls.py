from django.urls import path

from .views import (
    AdminEngagementAPIView,
    AuthorizationRequestDecisionAPIView,
    LoginAPIView,
    RegisterAPIView,
)

urlpatterns = [
    path("register", RegisterAPIView.as_view(), name="auth-register"),
    path("login", LoginAPIView.as_view(), name="auth-login"),
    path("admin/engagement", AdminEngagementAPIView.as_view(), name="auth-admin-engagement"),
    path(
        "authorization-requests/<int:id>/decision",
        AuthorizationRequestDecisionAPIView.as_view(),
        name="auth-authorization-request-decision",
    ),
]
