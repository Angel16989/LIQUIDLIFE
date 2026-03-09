from django.contrib import admin

from .models import Document, Job


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "doc_type", "created_at", "updated_at")
    list_filter = ("doc_type",)
    search_fields = ("title", "content", "external_link")


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ("id", "company", "role", "status", "application_date", "resume", "cover_letter")
    list_filter = ("status",)
    search_fields = ("company", "role", "notes")
