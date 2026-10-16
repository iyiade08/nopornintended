from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from .duration import duration_seconds


class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    ordering = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["ordering", "name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._build_unique_slug()
        super().save(*args, **kwargs)

    def _build_unique_slug(self):
        base_slug = slugify(self.name)[:120] or "category"
        slug = base_slug
        counter = 2
        while Category.objects.filter(slug=slug).exclude(pk=self.pk).exists():
            suffix = f"-{counter}"
            slug = f"{base_slug[:140 - len(suffix)]}{suffix}"
            counter += 1
        return slug


class Performer(models.Model):
    name = models.CharField(max_length=120, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "person"
        verbose_name_plural = "people"

    def __str__(self):
        return self.name


class Video(models.Model):
    performer = models.ForeignKey(
        Performer,
        related_name="videos",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="person",
        help_text="Select the same person on their videos to link them in related videos. Use their public or stage name.",
    )
    category = models.ForeignKey(
        Category,
        related_name="videos",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField(blank=True)
    video_file = models.FileField(upload_to="videos/", blank=True, null=True)
    video_url = models.URLField(blank=True)
    thumbnail = models.ImageField(upload_to="thumbnails/", blank=True, null=True)
    duration = models.CharField(max_length=20, blank=True, help_text="Use M:SS or H:MM:SS.")
    duration_seconds = models.PositiveIntegerField(null=True, blank=True, editable=False, db_index=True)
    views_count = models.PositiveBigIntegerField(default=0)
    downloads_count = models.PositiveBigIntegerField(default=0)
    is_published = models.BooleanField(default=True)
    published_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]

    def __str__(self):
        return self.title

    @property
    def path(self):
        if self.video_file:
            return self.video_file.url
        return self.video_url

    def clean(self):
        if self.duration and duration_seconds(self.duration) is None:
            raise ValidationError({"duration": "Use a duration such as 4:30 or 1:20:00."})
        if self.is_published and not self.video_file and not self.video_url:
            raise ValidationError(
                "A published video needs either an uploaded video file or a video URL."
            )

    def save(self, *args, **kwargs):
        self.duration_seconds = duration_seconds(self.duration)
        if kwargs.get("update_fields") and "duration" in kwargs["update_fields"]:
            kwargs["update_fields"] = set(kwargs["update_fields"]) | {"duration_seconds"}
        if not self.slug:
            self.slug = self._build_unique_slug()
        if self.is_published and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def _build_unique_slug(self):
        base_slug = slugify(self.title)[:240] or "video"
        slug = base_slug
        counter = 2
        while Video.objects.filter(slug=slug).exclude(pk=self.pk).exists():
            suffix = f"-{counter}"
            slug = f"{base_slug[:280 - len(suffix)]}{suffix}"
            counter += 1
        return slug


class VideoViewEvent(models.Model):
    video = models.ForeignKey(Video, related_name="view_events", on_delete=models.CASCADE)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"View: {self.video}"


class VideoDownloadEvent(models.Model):
    video = models.ForeignKey(
        Video,
        related_name="download_events",
        on_delete=models.CASCADE,
    )
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Download: {self.video}"


class VideoReaction(models.Model):
    video = models.ForeignKey(Video, related_name="reactions", on_delete=models.CASCADE)
    visitor_id = models.UUIDField()
    value = models.SmallIntegerField(choices=[(1, "Thumbs up"), (-1, "Thumbs down")])
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["video", "visitor_id"], name="one_reaction_per_visitor")]
        indexes = [models.Index(fields=["video", "value"], name="reaction_video_value")]


class VideoComment(models.Model):
    video = models.ForeignKey(Video, related_name="comments", on_delete=models.CASCADE)
    name = models.CharField(max_length=80)
    body = models.TextField(max_length=2000)
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-pk"]
        indexes = [models.Index(fields=["video", "is_approved", "-created_at"], name="comment_public_order")]

    def __str__(self):
        return f"Comment by {self.name} on {self.video}"
