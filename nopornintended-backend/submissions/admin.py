from django.contrib import admin

from .models import ContactMessage, ContentReport


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("subject", "name", "email", "is_read", "created_at")
    list_filter = ("is_read", "created_at")
    list_editable = ("is_read",)
    readonly_fields = ("name", "email", "subject", "message", "created_at")
    search_fields = ("name", "email", "subject", "message")

    def has_add_permission(self, request):
        return False


@admin.register(ContentReport)
class ContentReportAdmin(admin.ModelAdmin):
    list_display = ("id", "report_type", "video", "status", "email", "created_at")
    list_filter = ("report_type", "status", "created_at")
    list_editable = ("status",)
    readonly_fields = (
        "video",
        "content_url",
        "report_type",
        "email",
        "details",
        "created_at",
        "updated_at",
    )
    search_fields = ("video__title", "content_url", "email", "details")
    autocomplete_fields = ("video",)

    def has_add_permission(self, request):
        return False