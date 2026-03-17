from rest_framework import serializers

from jobs.models import Document


class ProcurementStatusSerializer(serializers.Serializer):
    provider = serializers.CharField()
    model = serializers.CharField(allow_blank=True)
    ai_configured = serializers.BooleanField()
    local_profile_storage = serializers.BooleanField()


class ProcurementBaseSerializer(serializers.Serializer):
    job_description = serializers.CharField()
    profile = serializers.JSONField()
    resume_document_id = serializers.IntegerField(required=False, allow_null=True)
    tone = serializers.CharField(required=False, allow_blank=True, default="professional")
    company_name = serializers.CharField(required=False, allow_blank=True, default="")
    target_role = serializers.CharField(required=False, allow_blank=True, default="")
    template_name = serializers.ChoiceField(
        required=False,
        choices=Document.TemplateName.choices,
        default=Document.TemplateName.BALANCED,
    )

    def validate_profile(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("profile must be an object.")
        return value


class CoverLetterGenerationSerializer(ProcurementBaseSerializer):
    pass


class ResumeGenerationSerializer(ProcurementBaseSerializer):
    pass


class AtsReviewSerializer(serializers.Serializer):
    job_description = serializers.CharField()
    resume_document_id = serializers.IntegerField(required=False, allow_null=True)
    resume_content = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if not attrs.get("resume_document_id") and not str(attrs.get("resume_content", "")).strip():
            raise serializers.ValidationError(
                {"resume_content": "Select a resume document or provide resume content to review."}
            )
        return attrs
