from rest_framework import serializers

from .document_content import extract_document_content
from .models import Document, Job


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = (
            "id",
            "title",
            "doc_type",
            "content",
            "file",
            "file_url",
            "external_link",
            "created_at",
            "updated_at",
        )

    def get_file_url(self, obj: Document) -> str | None:
        if not obj.file:
            return None

        request = self.context.get("request")
        url = obj.file.url
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

    def get_resume_title(self, obj: Job) -> str | None:
        return obj.resume.title if obj.resume else None

    def get_cover_letter_title(self, obj: Job) -> str | None:
        return obj.cover_letter.title if obj.cover_letter else None
