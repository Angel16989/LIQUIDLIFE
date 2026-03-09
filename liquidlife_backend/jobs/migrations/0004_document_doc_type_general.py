from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("jobs", "0003_document_and_job_document_fks"),
    ]

    operations = [
        migrations.AlterField(
            model_name="document",
            name="doc_type",
            field=models.CharField(
                choices=[("general", "General"), ("resume", "Resume"), ("cover_letter", "Cover Letter")],
                max_length=20,
            ),
        ),
    ]
