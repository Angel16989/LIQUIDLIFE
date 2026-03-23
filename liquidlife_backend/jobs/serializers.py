from django.urls import reverse
from rest_framework import serializers

from .document_content import extract_document_content
from .models import Document, Job
from .template_config import normalize_document_template_config


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = (
            "id",
            "title",
            "doc_type",
            "template_name",
            "template_config",
            "content",
            "file",
            "file_url",
            "external_link",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        validated = super().validate(attrs)
        template_name = validated.get("template_name")
        if template_name is None and self.instance is not None:
            template_name = self.instance.template_name
        doc_type = validated.get("doc_type")
        if doc_type is None and self.instance is not None:
            doc_type = self.instance.doc_type

        if doc_type == Document.DocType.RESUME:
            validated["template_config"] = normalize_document_template_config(
                validated.get("template_config"),
                template_name or Document.TemplateName.BALANCED,
            )
        else:
            validated["template_config"] = {}
        return validated

    def get_file_url(self, obj: Document) -> str | None:
        if not obj.file:
            return None

        request = self.context.get("request")
        url = reverse("documents-file", kwargs={"id": obj.id})
        return request.build_absolute_uri(url) if request else url

    def validate_file(self, value):
        if not value:
            return value

        name = value.name.lower()
        if not (name.endswith(".pdf") or name.endswith(".docx") or name.endswith(".txt")):
            raise serializers.ValidationError("Only PDF, DOCX, and TXT files are supported.")
        return value

    def create(self, validated_data):
        upload = validated_data.get("file")
        content = (validated_data.get("content") or "").strip()
        if upload and not content:
            validated_data["content"] = extract_document_content(upload)
        return super().create(validated_data)

    def update(self, instance: Document, validated_data):
        upload = validated_data.get("file")
        incoming_content = validated_data.get("content")
        should_replace_content = False

        if upload:
            if incoming_content is None:
                should_replace_content = not instance.content.strip()
            else:
                normalized_incoming = incoming_content.strip()
                should_replace_content = not normalized_incoming or incoming_content == instance.content

        if should_replace_content:
            validated_data["content"] = extract_document_content(upload)

        return super().update(instance, validated_data)


class JobSerializer(serializers.ModelSerializer):
    resume = serializers.PrimaryKeyRelatedField(
        queryset=Document.objects.filter(doc_type=Document.DocType.RESUME),
        allow_null=True,
        required=False,
    )
    cover_letter = serializers.PrimaryKeyRelatedField(
        queryset=Document.objects.filter(doc_type=Document.DocType.COVER_LETTER),
        allow_null=True,
        required=False,
    )
    resume_title = serializers.SerializerMethodField()
    cover_letter_title = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = (
            "id",
            "company",
            "role",
            "status",
            "notes",
            "application_date",
            "resume",
            "cover_letter",
            "resume_title",
            "cover_letter_title",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if not request or not getattr(request, "user", None) or not request.user.is_authenticated:
            return

        self.fields["resume"].queryset = Document.objects.filter(
            owner=request.user,
            doc_type=Document.DocType.RESUME,
        )
        self.fields["cover_letter"].queryset = Document.objects.filter(
            owner=request.user,
            doc_type=Document.DocType.COVER_LETTER,
        )

    def get_resume_title(self, obj: Job) -> str | None:
        return obj.resume.title if obj.resume else None

    def get_cover_letter_title(self, obj: Job) -> str | None:
        return obj.cover_letter.title if obj.cover_letter else None
