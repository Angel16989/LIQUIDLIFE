from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("jobs", "0002_job_resume_cover_letter"),
    ]

    operations = [
        migrations.CreateModel(
            name="Document",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                (
                    "doc_type",
                    models.CharField(
                        choices=[("resume", "Resume"), ("cover_letter", "Cover Letter")],
                        max_length=20,
                    ),
                ),
                ("content", models.TextField(blank=True)),
                ("file", models.FileField(blank=True, null=True, upload_to="documents/")),
                ("external_link", models.URLField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.RemoveField(
            model_name="job",
            name="cover_letter_id",
        ),
        migrations.RemoveField(
            model_name="job",
            name="resume_id",
        ),
        migrations.AddField(
            model_name="job",
            name="cover_letter",
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={"doc_type": "cover_letter"},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="cover_letter_jobs",
                to="jobs.document",
            ),
        ),
        migrations.AddField(
            model_name="job",
            name="resume",
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={"doc_type": "resume"},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="resume_jobs",
                to="jobs.document",
            ),
        ),
    ]
