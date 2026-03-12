from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import User
from rest_framework import serializers

from .models import AccountAuthorizationRequest, PasswordResetRequest

ADMIN_USERNAME = getattr(settings, "LIQUIDLIFE_ADMIN_USERNAME", "LIQUIDLIFEADMIN")


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_username(self, value: str) -> str:
        if value.strip().upper() == ADMIN_USERNAME.upper():
            raise serializers.ValidationError("This username is reserved.")
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate_email(self, value: str) -> str:
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("Email already exists.")
        return normalized

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            is_active=False,
        )
        AccountAuthorizationRequest.objects.create(
            user=user,
            status=AccountAuthorizationRequest.Status.PENDING,
        )
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value: str) -> str:
        return value.strip().lower()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=128)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)
    human_check = serializers.BooleanField()

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        if not attrs["human_check"]:
            raise serializers.ValidationError({"human_check": "Confirm that you are not a robot."})
        validate_password(attrs["password"])
        return attrs


class AdminSetPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)
    generate_password = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        password = attrs.get("password", "")
        generate_password = attrs.get("generate_password", False)

        if not generate_password and not password:
            raise serializers.ValidationError({"password": "Provide a password or enable password generation."})

        if password:
            validate_password(password)

        return attrs


class AccountAuthorizationRequestSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    reviewed_by_username = serializers.CharField(source="reviewed_by.username", read_only=True)

    class Meta:
        model = AccountAuthorizationRequest
        fields = (
            "id",
            "user_id",
            "username",
            "status",
            "note",
            "reviewed_by_username",
            "reviewed_at",
            "created_at",
            "updated_at",
        )


class AdminUserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField()
    authorization_status = serializers.SerializerMethodField()
    authorization_request_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "is_active",
            "is_staff",
            "date_joined",
            "last_login",
            "authorization_status",
            "authorization_request_id",
        )

    def get_authorization_status(self, obj: User) -> str:
        auth_request = getattr(obj, "authorization_request", None)
        if auth_request:
            return auth_request.status
        if obj.is_staff or obj.is_superuser:
            return "admin"
        return "approved" if obj.is_active else "inactive"

    def get_authorization_request_id(self, obj: User) -> int | None:
        auth_request = getattr(obj, "authorization_request", None)
        return auth_request.id if auth_request else None


class PasswordResetRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PasswordResetRequest
        fields = ("id", "token", "expires_at", "used_at", "created_at")
