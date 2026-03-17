from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("jobs", "0004_document_doc_type_general"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="template_name",
            field=models.CharField(
                choices=[("balanced", "Balanced"), ("executive", "Executive"), ("minimal", "Minimal")],
                default="balanced",
                max_length=20,
            ),
        ),
    ]
