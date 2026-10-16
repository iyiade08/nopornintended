from django.db import transaction
from django.db.models import Count, F, IntegerField, OuterRef, Q, Subquery
from django.db.models.functions import Coalesce, Lower
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Video, VideoComment, VideoReaction, VideoDownloadEvent, VideoViewEvent
from .pagination import CommentPagination, VideoPagination
from .serializers import CategorySerializer, CommentSerializer, ReactionSerializer, VideoDetailSerializer, VideoListSerializer, VideoQuerySerializer
from .throttles import CommentThrottle, ReactionThrottle


def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def get_user_agent(request):
    return request.META.get("HTTP_USER_AGENT", "")[:500]


def published_videos():
    def count_for(model, **filters):
        counts = model.objects.filter(video_id=OuterRef("pk"), **filters).order_by().values("video_id").annotate(total=Count("pk")).values("total")
        return Coalesce(Subquery(counts, output_field=IntegerField()), 0)
    return Video.objects.select_related("category", "performer").filter(is_published=True).annotate(
        likes_count=count_for(VideoReaction, value=1),
        dislikes_count=count_for(VideoReaction, value=-1),
        comments_count=count_for(VideoComment, is_approved=True),
    )


class CategoryListAPIView(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Category.objects.filter(is_active=True).order_by("ordering", "name")


class VideoListAPIView(generics.ListAPIView):
    serializer_class = VideoListSerializer
    permission_classes = [AllowAny]
    filter_backends = []
    pagination_class = VideoPagination
    require_search = False

    def get_queryset(self):
        serializer = VideoQuerySerializer(data=self.request.query_params)
        serializer.is_valid(raise_exception=True)
        params = serializer.validated_data
        queryset = published_videos()
        category = params.get("category")
        query = params.get("q", "").strip()

        if self.require_search and not query:
            return queryset.none()

        if category:
            queryset = queryset.filter(category__slug=category)
        if query:
            queryset = queryset.filter(
                Q(title__icontains=query)
                | Q(description__icontains=query)
                | Q(category__name__icontains=query)
            )
        if params.get("ids"):
            queryset = queryset.filter(pk__in=[int(value) for value in params["ids"].split(",")])
        duration = params.get("duration")
        if duration == "short":
            queryset = queryset.filter(duration_seconds__lt=600)
        elif duration == "medium":
            queryset = queryset.filter(duration_seconds__gte=600, duration_seconds__lt=1800)
        elif duration == "long":
            queryset = queryset.filter(duration_seconds__gte=1800)
        ordering = params["ordering"]
        if ordering in ("title", "-title"):
            ordering = Lower("title").desc() if ordering.startswith("-") else Lower("title").asc()
        return queryset.order_by(ordering, "-pk")


class VideoSearchAPIView(VideoListAPIView):
    require_search = True


class VideoDetailAPIView(generics.RetrieveAPIView):
    serializer_class = VideoDetailSerializer
    permission_classes = [AllowAny]
    lookup_url_kwarg = "pk"

    def get_queryset(self):
        return published_videos()


class RelatedVideosAPIView(generics.ListAPIView):
    serializer_class = VideoListSerializer
    permission_classes = [AllowAny]
    filter_backends = []
    pagination_class = VideoPagination

    def get_queryset(self):
        video = get_object_or_404(Video, pk=self.kwargs["pk"], is_published=True)
        if video.performer_id is None:
            return published_videos().none()
        return (
            published_videos()
            .filter(performer_id=video.performer_id)
            .exclude(pk=video.pk)
            .order_by("-published_at", "-pk")
        )


class VideoViewAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk):
        video = get_object_or_404(published_videos(), pk=pk)
        VideoViewEvent.objects.create(
            video=video,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
        )
        Video.objects.filter(pk=video.pk).update(views_count=F("views_count") + 1)
        video.refresh_from_db(fields=["views_count"])
        return Response(
            {"id": video.pk, "views": video.views_count},
            status=status.HTTP_201_CREATED,
        )


class VideoDownloadAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk):
        video = get_object_or_404(published_videos(), pk=pk)
        VideoDownloadEvent.objects.create(
            video=video,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
        )
        Video.objects.filter(pk=video.pk).update(downloads_count=F("downloads_count") + 1)
        video.refresh_from_db(fields=["downloads_count"])
        serializer = VideoDetailSerializer(video, context={"request": request})
        return Response(
            {
                "id": video.pk,
                "download_url": serializer.data["path"],
                "downloads": video.downloads_count,
                "video": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class VideoReactionAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ReactionThrottle]

    def post(self, request, pk):
        serializer = ReactionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            video = get_object_or_404(Video.objects.select_for_update(), pk=pk, is_published=True)
            if data["value"] == 0:
                VideoReaction.objects.filter(video=video, visitor_id=data["visitor_id"]).delete()
            else:
                VideoReaction.objects.update_or_create(video=video, visitor_id=data["visitor_id"], defaults={"value": data["value"]})
            return Response({
                "value": data["value"],
                "likes_count": video.reactions.filter(value=1).count(),
                "dislikes_count": video.reactions.filter(value=-1).count(),
            })


class VideoCommentListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [AllowAny]
    throttle_classes = [CommentThrottle]
    pagination_class = CommentPagination
    filter_backends = []

    def get_video(self):
        return get_object_or_404(Video, pk=self.kwargs["pk"], is_published=True)

    def get_queryset(self):
        return VideoComment.objects.filter(video=self.get_video(), is_approved=True)

    def perform_create(self, serializer):
        serializer.save(video=self.get_video(), is_approved=False)
