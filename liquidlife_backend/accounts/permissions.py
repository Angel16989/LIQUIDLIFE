from django.conf import settings
from rest_framework.permissions import BasePermission


class IsVerifiedAccountOrAdmin(BasePermission):
    message = "Complete the required account verification before using this feature."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        if user.is_staff or user.is_superuser:
            return True

        security_state = getattr(user, "security_state", None)
        if security_state is None:
            return False

        if not getattr(settings, "ACCOUNT_VERIFICATION_REQUIRED", False):
            return True

        if not security_state.email_verified_at:
            return False

        phone_verification_configured = bool(
            getattr(settings, "TWILIO_ACCOUNT_SID", "")
            and getattr(settings, "TWILIO_AUTH_TOKEN", "")
            and getattr(settings, "TWILIO_VERIFY_SERVICE_SID", "")
        )
        if phone_verification_configured:
            return bool(security_state.phone_verified_at)

        return True
