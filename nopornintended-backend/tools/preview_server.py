"""Serve harmless fixtures in an in-memory database for frontend QA only."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ["DJANGO_SETTINGS_MODULE"] = "config.test_settings"

import django
from django.conf import settings

settings.DATABASES["default"]["NAME"] = "file:npi-frontend-preview?mode=memory&cache=shared"
settings.DATABASES["default"]["OPTIONS"] = {"uri": True}
settings.CORS_ALLOWED_ORIGINS = ["http://127.0.0.1:5174"]
settings.MEDIA_URL = "/_qa/thumbs/"
settings.DEBUG = True
django.setup()

from django.core.management import call_command
from django.http import HttpResponse
from django.urls import path
from config.urls import urlpatterns
from pages.models import StaticPage
from videos.models import Category, Video, VideoComment, VideoReaction
from uuid import UUID


def poster(request, filename):
    index = int(filename.split(".")[0]) if filename.split(".")[0].isdigit() else 1
    colors = [("#6c466b", "#272438"), ("#476a78", "#202e3e"), ("#95634d", "#3e2836"), ("#615d91", "#242237")]
    first, second = colors[index % len(colors)]
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="{first}"/><stop offset="1" stop-color="{second}"/></linearGradient></defs><path fill="url(#g)" d="M0 0h640v360H0z"/><circle cx="480" cy="90" r="64" fill="#fff" opacity=".08"/><path d="M0 300 210 100 420 360H0Z" fill="#fff" opacity=".06"/><path d="m240 360 200-220 200 220" fill="#fff" opacity=".05"/><text x="36" y="315" fill="#ffffffbb" font-family="sans-serif" font-size="17" letter-spacing="3">SAMPLE FILM {index:02}</text></svg>'
    return HttpResponse(svg, content_type="image/svg+xml")


urlpatterns.insert(0, path("_qa/thumbs/<str:filename>", poster))
call_command("migrate", verbosity=0)
categories = [Category.objects.create(name=name) for name in ("Featured", "Short films", "Interviews", "Behind the scenes")]
titles = ["A quiet moment — sample film", "An evening in the city", "Behind the camera: a conversation", "The art of taking your time", "A longer title to check how video cards wrap across smaller screens"]
for index in range(1, 30):
    video = Video.objects.create(title=titles[(index - 1) % len(titles)] + (f" · {index}" if index > 5 else ""), category=categories[(index - 1) % len(categories)], description="Harmless sample content for local frontend testing. This fixture database is isolated from the live website.", video_url="http://127.0.0.1:5174/src/assets/video/coming-soon%20.mp4", thumbnail=f"{index}.svg" if index != 5 else "", duration=["4:30", "12:15", "32:00", "8:45"][(index - 1) % 4], views_count=1240 * index)
    if index == 29:
        for number, value in [(1, 1), (2, 1), (3, -1)]:
            VideoReaction.objects.create(video=video, visitor_id=UUID(int=number), value=value)
        VideoComment.objects.create(video=video, name="Preview reader", body="A sample approved comment for checking the layout.", is_approved=True)
for slug, title in [("terms", "Terms of Use"), ("privacy", "Privacy Policy")]:
    StaticPage.objects.create(slug=slug, title=title, body="Local preview content only.\n\nThis is a sample page used to verify typography and spacing. The live site displays the content published in Django Admin.")
print("Frontend QA fixtures ready. This database exists only in memory.", flush=True)
call_command("runserver", "127.0.0.1:8001", use_reloader=False, use_threading=False)
