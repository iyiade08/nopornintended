from django.urls import path

from .views import (
    CategoryListAPIView,
    RelatedVideosAPIView,
    VideoDetailAPIView,
    VideoDownloadAPIView,
    VideoListAPIView,
    VideoSearchAPIView,
    VideoViewAPIView,
)

urlpatterns = [
    path("categories/", CategoryListAPIView.as_view(), name="category-list"),
    path("videos/", VideoListAPIView.as_view(), name="video-list"),
    path("videos/search/", VideoSearchAPIView.as_view(), name="video-search"),
    path("videos/<int:pk>/", VideoDetailAPIView.as_view(), name="video-detail"),
    path("videos/<int:pk>/related/", RelatedVideosAPIView.as_view(), name="video-related"),
    path("videos/<int:pk>/view/", VideoViewAPIView.as_view(), name="video-view"),
    path("videos/<int:pk>/download/", VideoDownloadAPIView.as_view(), name="video-download"),
]