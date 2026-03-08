from django.contrib import admin

from .models import Job


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ("company", "role", "status", "application_date")
    search_fields = ("company", "role", "status")
    list_filter = ("status", "application_date")
