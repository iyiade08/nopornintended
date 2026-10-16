from django.test import TestCase
from rest_framework.test import APIClient
from .models import StaticPage


class PolicyTests(TestCase):
    def test_only_published_policy_content_is_public(self):
        client = APIClient()
        StaticPage.objects.create(title="Terms", slug="terms", body="Published text.")
        StaticPage.objects.create(title="Privacy", slug="privacy", body="Draft text.", is_published=False)
        self.assertEqual(client.get("/api/pages/terms/").data["body"], "Published text.")
        self.assertEqual(client.get("/api/pages/privacy/").status_code, 404)
