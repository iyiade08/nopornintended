from django.contrib import admin

from .models import Category, Video, VideoDownloadEvent, VideoViewEvent


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "ordering", "updated_at")
    list_filter = ("is_active",)
    list_editable = ("is_active", "ordering")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "description")


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "category",
        "is_published",
        "duration",
        "views_count",
        "downloads_count",
        "published_at",
    )
    list_filter = ("is_published", "category", "created_at", "published_at")
    list_editable = ("is_published",)
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("views_count", "downloads_count", "created_at", "updated_at")
    search_fields = ("title", "description", "category__name")
    autocomplete_fields = ("category",)
    fieldsets = (
        ("Content", {"fields": ("title", "slug", "description", "category")}),
        ("Media", {"fields": ("video_file", "video_url", "thumbnail", "duration")}),
        ("Publishing", {"fields": ("is_published", "published_at")}),
        ("Stats", {"fields": ("views_count", "downloads_count")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(VideoViewEvent)
class VideoViewEventAdmin(admin.ModelAdmin):
    list_display = ("video", "ip_address", "created_at")
    list_filter = ("created_at",)
    readonly_fields = ("video", "ip_address", "user_agent", "created_at")
    search_fields = ("video__title", "ip_address", "user_agent")

    def has_add_permission(self, request):
        return False


@admin.register(VideoDownloadEvent)
class VideoDownloadEventAdmin(admin.ModelAdmin):
    list_display = ("video", "ip_address", "created_at")
    list_filter = ("created_at",)
    readonly_fields = ("video", "ip_address", "user_agent", "created_at")
    search_fields = ("video__title", "ip_address", "user_agent")

    def has_add_permission(self, request):
        return False