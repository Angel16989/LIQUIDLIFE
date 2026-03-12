from django.contrib import admin

from .models import AccountAuthorizationRequest, PasswordResetRequest


@admin.register(AccountAuthorizationRequest)
class AccountAuthorizationRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "reviewed_by", "reviewed_at", "created_at")
    list_filter = ("status", "created_at", "reviewed_at")
    search_fields = ("user__username", "note")


@admin.register(PasswordResetRequest)
class PasswordResetRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "expires_at", "used_at", "created_at")
    list_filter = ("expires_at", "used_at", "created_at")
    search_fields = ("user__username", "user__email", "token")
