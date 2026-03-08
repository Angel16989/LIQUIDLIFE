from django.db import models


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

    def __str__(self) -> str:
        return f"{self.company} - {self.role}"
