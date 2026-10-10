from rest_framework import serializers

from .models import Category, Video


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