from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Video, VideoDownloadEvent, VideoViewEvent
from .serializers import CategorySerializer, VideoDetailSerializer, VideoListSerializer


def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def get_user_agent(request):
    return request.META.get("HTTP_USER_AGENT", "")[:500]


def published_videos():
    return Video.objects.select_related("category").filter(is_published=True)


class CategoryListAPIView(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Category.objects.filter(is_active=True).order_by("ordering", "name")


class VideoListAPIView(generics.ListAPIView):
    serializer_class = VideoListSerializer
    permission_classes = [AllowAny]
    ordering_fields = ["created_at", "published_at", "views_count", "downloads_count", "title"]
    ordering = ["-published_at", "-created_at"]

    def get_queryset(self):
        queryset = published_videos()
        category = self.request.query_params.get("category")
        query = self.request.query_params.get("q")

        if category:
            queryset = queryset.filter(category__slug=category)
        if query:
            queryset = queryset.filter(
                Q(title__icontains=query)
                | Q(description__icontains=query)
                | Q(category__name__icontains=query)
            )
        return queryset


class VideoSearchAPIView(generics.ListAPIView):
    serializer_class = VideoListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        query = self.request.query_params.get("q", "").strip()
        if not query:
            return Video.objects.none()
        return published_videos().filter(
            Q(title__icontains=query)
            | Q(description__icontains=query)
            | Q(category__name__icontains=query)
        )


class VideoDetailAPIView(generics.RetrieveAPIView):
    serializer_class = VideoDetailSerializer
    permission_classes = [AllowAny]
    lookup_url_kwarg = "pk"

    def get_queryset(self):
        return published_videos()


class RelatedVideosAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        video = get_object_or_404(published_videos(), pk=pk)
        base_queryset = published_videos().exclude(pk=video.pk)
        related_queryset = base_queryset

        if video.category_id:
            related_queryset = base_queryset.filter(category_id=video.category_id)

        related = list(related_queryset[:4])
        if len(related) < 4:
            seen_ids = [video.pk] + [item.pk for item in related]
            related.extend(list(base_queryset.exclude(pk__in=seen_ids)[: 4 - len(related)]))

        serializer = VideoListSerializer(
            related,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data)


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