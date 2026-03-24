from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import User
from rest_framework import serializers

from .models import AccountAuthorizationRequest, PasswordResetRequest

ADMIN_USERNAME = getattr(settings, "LIQUIDLIFE_ADMIN_USERNAME", "LIQUIDLIFEADMIN")


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={"min_length": "Password must be at least 8 characters."},
    )

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


class AdminCreateUserSerializer(RegisterSerializer):
    pass


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value: str) -> str:
        return value.strip().lower()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=128)
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={"min_length": "Password must be at least 8 characters."},
    )
    confirm_password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={"min_length": "Password confirmation must be at least 8 characters."},
    )
    human_check = serializers.BooleanField()

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        if not attrs["human_check"]:
            raise serializers.ValidationError({"human_check": "Confirm that you are not a robot."})
        validate_password(attrs["password"])
        return attrs


class AdminSetPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        required=False,
        allow_blank=True,
        error_messages={"min_length": "Password must be at least 8 characters."},
    )
    generate_password = serializers.BooleanField(required=False, default=False)
    require_password_change = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        password = attrs.get("password", "")
        generate_password = attrs.get("generate_password", False)

        if not generate_password and not password:
            raise serializers.ValidationError({"password": "Provide a password or enable password generation."})

        if password:
            validate_password(password)

        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={"min_length": "Password must be at least 8 characters."},
    )
    confirm_password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={"min_length": "Password confirmation must be at least 8 characters."},
    )

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        validate_password(attrs["password"])
        return attrs


class SendEmailVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_email(self, value: str) -> str:
        return value.strip().lower()


class PhoneVerificationStartSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=32)

    def validate_phone_number(self, value: str) -> str:
        normalized = value.strip().replace(" ", "")
        if not normalized.startswith("+") or not normalized[1:].isdigit() or len(normalized) < 8 or len(normalized) > 16:
            raise serializers.ValidationError("Use a valid phone number in international format, for example +61400111222.")
        return normalized


class PhoneVerificationCheckSerializer(PhoneVerificationStartSerializer):
    code = serializers.CharField(max_length=10)

    def validate_code(self, value: str) -> str:
        normalized = value.strip()
        if not normalized.isdigit() or len(normalized) < 4 or len(normalized) > 10:
            raise serializers.ValidationError("Enter the SMS verification code.")
        return normalized


class VerificationStatusSerializer(serializers.Serializer):
    email = serializers.EmailField(allow_blank=True)
    email_verified = serializers.BooleanField()
    phone_number = serializers.CharField(allow_blank=True)
    phone_verified = serializers.BooleanField()
    phone_verification_configured = serializers.BooleanField()
    verification_required = serializers.BooleanField()
    verification_notice_enabled = serializers.BooleanField()


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
    must_change_password = serializers.SerializerMethodField()
    email_verified = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()
    phone_verified = serializers.SerializerMethodField()

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
            "must_change_password",
            "email_verified",
            "phone_number",
            "phone_verified",
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

    def get_must_change_password(self, obj: User) -> bool:
        security_state = getattr(obj, "security_state", None)
        return bool(security_state and security_state.must_change_password)

    def get_email_verified(self, obj: User) -> bool:
        security_state = getattr(obj, "security_state", None)
        return bool(security_state and security_state.email_verified_at)

    def get_phone_number(self, obj: User) -> str:
        security_state = getattr(obj, "security_state", None)
        return security_state.phone_number if security_state and security_state.phone_number else ""

    def get_phone_verified(self, obj: User) -> bool:
        security_state = getattr(obj, "security_state", None)
        return bool(security_state and security_state.phone_verified_at)


class PasswordResetRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PasswordResetRequest
        fields = ("id", "token", "expires_at", "used_at", "created_at")
