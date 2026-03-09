from django.contrib.auth.models import User
from rest_framework import serializers

from .models import AccountAuthorizationRequest


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_username(self, value: str) -> str:
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
            is_active=True,
        )
        AccountAuthorizationRequest.objects.create(
            user=user,
            status=AccountAuthorizationRequest.Status.APPROVED,
        )
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)


class AccountAuthorizationRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    reviewed_by_username = serializers.CharField(source="reviewed_by.username", read_only=True)

    class Meta:
        model = AccountAuthorizationRequest
        fields = (
            "id",
            "username",
            "status",
            "note",
            "reviewed_by_username",
            "reviewed_at",
            "created_at",
            "updated_at",
        )
