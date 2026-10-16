import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("videos", "0002_video_feedback_and_duration")]

    operations = [
        migrations.CreateModel(
            name="Performer",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120, unique=True)),
            ],
            options={"ordering": ["name"], "verbose_name": "person", "verbose_name_plural": "people"},
        ),
        migrations.AddField(
            model_name="video",
            name="performer",
            field=models.ForeignKey(
                blank=True,
                help_text="Select the same person on their videos to link them in related videos. Use their public or stage name.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="videos",
                to="videos.performer",
                verbose_name="person",
            ),
        ),
    ]
