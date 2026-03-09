from django.db import models


class Document(models.Model):
    class DocType(models.TextChoices):
        GENERAL = "general", "General"
        RESUME = "resume", "Resume"
        COVER_LETTER = "cover_letter", "Cover Letter"

    title = models.CharField(max_length=255)
    doc_type = models.CharField(max_length=20, choices=DocType.choices)
    content = models.TextField(blank=True)
    file = models.FileField(upload_to="documents/", blank=True, null=True)
    external_link = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.title} ({self.doc_type})"


class Job(models.Model):
    class Status(models.TextChoices):
        APPLIED = "Applied", "Applied"
        INTERVIEW = "Interview", "Interview"
        OFFER = "Offer", "Offer"
        REJECTED = "Rejected", "Rejected"

    company = models.CharField(max_length=255)
    role = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.APPLIED)
    notes = models.TextField(blank=True)
    application_date = models.DateField()
    resume = models.ForeignKey(
        Document,
        related_name="resume_jobs",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        limit_choices_to={"doc_type": Document.DocType.RESUME},
    )
    cover_letter = models.ForeignKey(
        Document,
        related_name="cover_letter_jobs",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        limit_choices_to={"doc_type": Document.DocType.COVER_LETTER},
    )

    def __str__(self) -> str:
        return f"{self.company} - {self.role}"
