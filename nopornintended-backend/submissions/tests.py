from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient
from videos.models import Video
from .models import ContactMessage, ContentReport


class SubmissionTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_contact_is_persisted(self):
        response = self.client.post("/api/contact/", {"name": "Test Reader", "email": "reader@example.com", "subject": "A question", "message": "Hello team"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(ContactMessage.objects.count(), 1)

    def test_contact_validation(self):
        response = self.client.post("/api/contact/", {"name": "", "email": "invalid", "subject": "", "message": "x" * 5001}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)
        self.assertIn("message", response.data)

    def test_report_attaches_video_without_allowing_status_changes(self):
        video = Video.objects.create(title="Sample", video_url="https://example.com/sample.mp4")
        response = self.client.post("/api/reports/", {"video_id": video.pk, "report_type": "broken", "details": "Playback is unavailable.", "status": "resolved"}, format="json")
        self.assertEqual(response.status_code, 201)
        report = ContentReport.objects.get()
        self.assertEqual(report.video_id, video.pk)
        self.assertEqual(report.status, "new")

    def test_report_requires_a_target(self):
        self.assertEqual(self.client.post("/api/reports/", {"details": "Playback is unavailable."}, format="json").status_code, 400)

    def test_report_accepts_content_url(self):
        self.assertEqual(self.client.post("/api/reports/", {"content_url": "https://example.com/content", "details": "Playback is unavailable.", "report_type": "broken"}, format="json").status_code, 201)
