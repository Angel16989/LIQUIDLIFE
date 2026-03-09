from rest_framework import serializers

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
