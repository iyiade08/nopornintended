from django.db import models

from videos.models import Video


class ContactMessage(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    subject = models.CharField(max_length=180)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.subject} - {self.email}"


class ContentReport(models.Model):
    class ReportType(models.TextChoices):
        DMCA = "dmca", "DMCA / Copyright"
        ILLEGAL = "illegal", "Illegal content"
        BROKEN = "broken", "Broken video"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        NEW = "new", "New"
        REVIEWING = "reviewing", "Reviewing"
        RESOLVED = "resolved", "Resolved"
        REJECTED = "rejected", "Rejected"

    video = models.ForeignKey(
        Video,
        related_name="reports",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    content_url = models.URLField(blank=True)
    report_type = models.CharField(
        max_length=20,
        choices=ReportType.choices,
        default=ReportType.DMCA,
    )
    email = models.EmailField(blank=True)
    details = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NEW,
    )
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_report_type_display()} report #{self.pk}"