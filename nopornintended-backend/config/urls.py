from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def api_root(request):
    return JsonResponse(
        {
            "name": "nopornintended API",
            "endpoints": {
                "videos": "/api/videos/",
                "video_detail": "/api/videos/<id>/",
                "related_videos": "/api/videos/<id>/related/",
                "categories": "/api/categories/",
                "search": "/api/videos/search/?q=<term>",
                "track_view": "/api/videos/<id>/view/",
                "track_download": "/api/videos/<id>/download/",
                "pages": "/api/pages/<slug>/",
                "contact": "/api/contact/",
                "reports": "/api/reports/",
            },
        }
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", api_root, name="api-root"),
    path("api/", include("videos.urls")),
    path("api/", include("pages.urls")),
    path("api/", include("submissions.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)