# Generated manually for initial Job model.
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Job",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("company", models.CharField(max_length=255)),
                ("role", models.CharField(max_length=255)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("Applied", "Applied"),
                            ("Interview", "Interview"),
                            ("Offer", "Offer"),
                            ("Rejected", "Rejected"),
                        ],
                        default="Applied",
                        max_length=20,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                ("application_date", models.DateField()),
            ],
        ),
    ]
