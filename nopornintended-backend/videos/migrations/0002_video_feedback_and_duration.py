import re

import django.db.models.deletion
from django.db import migrations, models


def backfill_durations(apps, schema_editor):
    Video = apps.get_model("videos", "Video")
    batch = []
    for video in Video.objects.using(schema_editor.connection.alias).all().iterator(chunk_size=500):
        text = str(video.duration or "").strip()
        if re.fullmatch(r"\d{1,6}(?::\d{2}){0,2}", text):
            parts = [int(part) for part in text.split(":")]
            if len(parts) == 1 or all(part < 60 for part in parts[1:]):
                total = 0
                for part in parts:
                    total = total * 60 + part
                if total <= 2147483647:
                    video.duration_seconds = total
                    batch.append(video)
        if len(batch) >= 500:
            Video.objects.using(schema_editor.connection.alias).bulk_update(batch, ["duration_seconds"])
            batch = []
    if batch:
        Video.objects.using(schema_editor.connection.alias).bulk_update(batch, ["duration_seconds"])


class Migration(migrations.Migration):
    dependencies = [("videos", "0001_initial")]
    operations = [
        migrations.AddField(model_name="video", name="duration_seconds", field=models.PositiveIntegerField(blank=True, db_index=True, editable=False, null=True)),
        migrations.AlterField(model_name="video", name="duration", field=models.CharField(blank=True, help_text="Use M:SS or H:MM:SS.", max_length=20)),
        migrations.RunPython(backfill_durations, migrations.RunPython.noop),
        migrations.CreateModel(
            name="VideoComment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=80)),
                ("body", models.TextField(max_length=2000)),
                ("is_approved", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("video", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="comments", to="videos.video")),
            ],
            options={"ordering": ["-created_at", "-pk"], "indexes": [models.Index(fields=["video", "is_approved", "-created_at"], name="comment_public_order")]},
        ),
        migrations.CreateModel(
            name="VideoReaction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("visitor_id", models.UUIDField()),
                ("value", models.SmallIntegerField(choices=[(1, "Thumbs up"), (-1, "Thumbs down")])),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("video", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reactions", to="videos.video")),
            ],
            options={"indexes": [models.Index(fields=["video", "value"], name="reaction_video_value")], "constraints": [models.UniqueConstraint(fields=("video", "visitor_id"), name="one_reaction_per_visitor")]},
        ),
    ]
