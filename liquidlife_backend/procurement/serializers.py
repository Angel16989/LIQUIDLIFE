from rest_framework import serializers

from jobs.models import Document
from jobs.template_config import normalize_document_template_config


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
    template_config = serializers.JSONField(required=False, default=dict)

    def validate_profile(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("profile must be an object.")
        return value

    def validate(self, attrs):
        validated = super().validate(attrs)
        validated["template_config"] = normalize_document_template_config(
            validated.get("template_config"),
            validated.get("template_name", Document.TemplateName.BALANCED),
        )
        return validated


class CoverLetterGenerationSerializer(ProcurementBaseSerializer):
    pass


class ResumeGenerationSerializer(ProcurementBaseSerializer):
    pass


class ApplicationPairGenerationSerializer(ProcurementBaseSerializer):
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


class ResumeAutofillSerializer(serializers.Serializer):
    resume = serializers.FileField()

    def validate_resume(self, value):
        name = str(getattr(value, "name", "")).lower()
        if not name.endswith((".pdf", ".docx", ".txt")):
            raise serializers.ValidationError("Upload a PDF, DOCX, or TXT resume.")
        return value
