from rest_framework import serializers

from .models import Category, Video, VideoComment


def absolute_url(request, url):
    if not url:
        return ""
    if url.startswith(("http://", "https://")):
        return url
    if request is None:
        return url
    return request.build_absolute_uri(url)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description"]


class VideoListSerializer(serializers.ModelSerializer):
    likes_count = serializers.IntegerField(read_only=True, default=0)
    dislikes_count = serializers.IntegerField(read_only=True, default=0)
    comments_count = serializers.IntegerField(read_only=True, default=0)
    label = serializers.CharField(source="title", read_only=True)
    path = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    views = serializers.IntegerField(source="views_count", read_only=True)
    downloads = serializers.IntegerField(source="downloads_count", read_only=True)
    category = CategorySerializer(read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        model = Video
        fields = [
            "id",
            "label",
            "title",
            "slug",
            "description",
            "path",
            "thumbnail",
            "duration",
            "views",
            "downloads",
            "category",
            "category_slug",
            "published_at",
            "created_at",
            "likes_count",
            "dislikes_count",
            "comments_count",
        ]

    def get_path(self, obj):
        request = self.context.get("request")
        return absolute_url(request, obj.path)

    def get_thumbnail(self, obj):
        if not obj.thumbnail:
            return ""
        request = self.context.get("request")
        return absolute_url(request, obj.thumbnail.url)


class VideoDetailSerializer(VideoListSerializer):
    class Meta(VideoListSerializer.Meta):
        fields = VideoListSerializer.Meta.fields + ["updated_at"]


class ReactionSerializer(serializers.Serializer):
    visitor_id = serializers.UUIDField()
    value = serializers.ChoiceField(choices=[-1, 0, 1])


class CommentSerializer(serializers.ModelSerializer):
    name = serializers.CharField(min_length=2, max_length=80)
    body = serializers.CharField(min_length=3, max_length=2000)

    class Meta:
        model = VideoComment
        fields = ["id", "name", "body", "created_at"]
        read_only_fields = ["id", "created_at"]


class VideoQuerySerializer(serializers.Serializer):
    category = serializers.SlugField(required=False)
    q = serializers.CharField(required=False, allow_blank=True, max_length=200)
    duration = serializers.ChoiceField(choices=["short", "medium", "long"], required=False)
    ids = serializers.RegexField(r"^\d+(,\d+){0,499}$", required=False, max_length=5500)
    ordering = serializers.ChoiceField(choices=["published_at", "-published_at", "created_at", "-created_at", "views_count", "-views_count", "downloads_count", "-downloads_count", "title", "-title"], default="-published_at")

    def validate_ids(self, value):
        if any(not 0 < int(item) <= 9223372036854775807 for item in value.split(",")):
            raise serializers.ValidationError("Provide valid video IDs.")
        return value
