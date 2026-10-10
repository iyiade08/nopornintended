from django.urls import path

from .views import StaticPageDetailAPIView

urlpatterns = [
    path("pages/<slug:slug>/", StaticPageDetailAPIView.as_view(), name="static-page-detail"),
]