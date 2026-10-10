from rest_framework import serializers

from videos.models import Video
from videos.serializers import VideoListSerializer

from .models import ContactMessage, ContentReport


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ["id", "name", "email", "subject", "message", "created_at"]
        read_only_fields = ["id", "created_at"]


class ContentReportSerializer(serializers.ModelSerializer):
    video = VideoListSerializer(read_only=True)
    video_id = serializers.PrimaryKeyRelatedField(
        source="video",
        queryset=Video.objects.filter(is_published=True),
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = ContentReport
        fields = [
            "id",
            "video",
            "video_id",
            "content_url",
            "report_type",
            "email",
            "details",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "video", "status", "created_at"]

    def validate(self, attrs):
        if not attrs.get("video") and not attrs.get("content_url"):
            raise serializers.ValidationError(
                "Provide either a video_id or a content_url for the report."
            )
        return attrs