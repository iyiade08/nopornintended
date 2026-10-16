from django.contrib import admin

from .models import Category, Performer, Video, VideoComment, VideoReaction, VideoDownloadEvent, VideoViewEvent


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "ordering", "updated_at")
    list_filter = ("is_active",)
    list_editable = ("is_active", "ordering")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "description")


@admin.register(Performer)
class PerformerAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "category",
        "performer",
        "is_published",
        "duration",
        "views_count",
        "downloads_count",
        "published_at",
    )
    list_filter = ("is_published", "performer", "category", "created_at", "published_at")
    list_editable = ("performer", "is_published")
    list_select_related = ("category", "performer")
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("views_count", "downloads_count", "created_at", "updated_at")
    search_fields = ("title", "description", "category__name", "performer__name")
    autocomplete_fields = ("category", "performer")
    fieldsets = (
        ("Content", {"fields": ("title", "slug", "description", "category", "performer")}),
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


@admin.register(VideoComment)
class VideoCommentAdmin(admin.ModelAdmin):
    list_display = ("name", "video", "is_approved", "created_at")
    list_filter = ("is_approved", "created_at")
    search_fields = ("name", "body", "video__title")
    readonly_fields = ("created_at",)
    autocomplete_fields = ("video",)
    actions = ("approve_comments", "hide_comments")

    @admin.action(description="Approve selected comments")
    def approve_comments(self, request, queryset):
        queryset.update(is_approved=True)

    @admin.action(description="Hide selected comments")
    def hide_comments(self, request, queryset):
        queryset.update(is_approved=False)


@admin.register(VideoReaction)
class VideoReactionAdmin(admin.ModelAdmin):
    list_display = ("video", "value", "updated_at")
    list_filter = ("value",)
    readonly_fields = ("video", "visitor_id", "value", "updated_at")
    search_fields = ("video__title",)

    def has_add_permission(self, request):
        return False
