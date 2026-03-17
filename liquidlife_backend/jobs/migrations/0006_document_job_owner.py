from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


ADMIN_USERNAME = "LIQUIDLIFEADMIN"


def assign_legacy_owner(apps, schema_editor):
    User = apps.get_model("auth", "User")
    Document = apps.get_model("jobs", "Document")
    Job = apps.get_model("jobs", "Job")

    admin_user = User.objects.filter(username=ADMIN_USERNAME).order_by("id").first()
    active_non_admin_users = User.objects.exclude(username=ADMIN_USERNAME).filter(is_active=True).order_by("date_joined", "id")
    non_admin_users = User.objects.exclude(username=ADMIN_USERNAME).order_by("date_joined", "id")

    if active_non_admin_users.count() == 1:
        owner = active_non_admin_users.first()
    elif non_admin_users.count() == 1:
        owner = non_admin_users.first()
    else:
        if admin_user is None:
            admin_user = User.objects.create(
                username=ADMIN_USERNAME,
                is_active=True,
                is_staff=True,
                is_superuser=True,
                password="!",
            )
        owner = admin_user

    Document.objects.filter(owner__isnull=True).update(owner_id=owner.id)
    Job.objects.filter(owner__isnull=True).update(owner_id=owner.id)


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("jobs", "0005_document_template_name"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="owner",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="documents",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="job",
            name="owner",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="jobs",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(assign_legacy_owner, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="document",
            name="owner",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="documents",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="job",
            name="owner",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="jobs",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
