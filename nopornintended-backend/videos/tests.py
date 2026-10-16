from uuid import uuid4
from importlib import import_module
from types import SimpleNamespace

from django.apps import apps
from django.core.cache import cache
from django.db import connection
from django.test import TestCase
from rest_framework.test import APIClient

from .duration import duration_seconds
from .models import Category, Performer, Video, VideoComment, VideoReaction


class VideoAPITests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.category = Category.objects.create(name="Featured")
        self.video = Video.objects.create(title="Sample film", category=self.category, video_url="https://example.com/sample.mp4", duration="9:59")
        self.hidden = Video.objects.create(title="Private film", is_published=False)
        self.url = f"/api/videos/{self.video.pk}"

    def test_duration_normalization(self):
        for text, expected in [("9:59", 599), ("10:00", 600), ("1:20:00", 4800), ("90", 90), ("", None), ("soon", None), ("5:70", None)]:
            with self.subTest(text=text):
                self.assertEqual(duration_seconds(text), expected)

    def test_updating_duration_updates_filter_value(self):
        self.video.duration = "30:00"
        self.video.save(update_fields=["duration"])
        self.video.refresh_from_db()
        self.assertEqual(self.video.duration_seconds, 1800)

    def test_legacy_list_response(self):
        response = self.client.get("/api/videos/")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)
        self.assertEqual([item["id"] for item in response.data], [self.video.pk])

    def test_pagination_stable_order_and_page_size_limit(self):
        for index in range(50):
            Video.objects.create(title=f"Sample {index}", video_url="https://example.com/sample.mp4")
        first = self.client.get("/api/videos/", {"page": 1}).data
        second = self.client.get("/api/videos/", {"page": 2}).data
        self.assertEqual(first["count"], 51)
        self.assertEqual(len(first["results"]), 10)
        self.assertEqual(len(second["results"]), 10)
        self.assertIsNotNone(first["next"])
        self.assertIsNotNone(second["previous"])
        self.assertFalse({item["id"] for item in first["results"]} & {item["id"] for item in second["results"]})
        last = self.client.get("/api/videos/", {"page": 6}).data
        self.assertEqual(len(last["results"]), 1)
        self.assertIsNone(last["next"])
        self.assertIsNotNone(last["previous"])
        explicit = self.client.get("/api/videos/", {"page": 2, "page_size": 10}).data
        self.assertEqual(len(explicit["results"]), 10)
        self.assertEqual(len(self.client.get("/api/videos/", {"page_size": 10000}).data["results"]), 48)

    def test_duration_boundaries_exclude_unknowns(self):
        medium = Video.objects.create(title="Medium", video_url="https://example.com/sample.mp4", duration="10:00")
        long = Video.objects.create(title="Long", video_url="https://example.com/sample.mp4", duration="30:00")
        Video.objects.create(title="Unknown", video_url="https://example.com/sample.mp4")
        for value, expected in [("short", self.video.pk), ("medium", medium.pk), ("long", long.pk)]:
            self.assertEqual([item["id"] for item in self.client.get("/api/videos/", {"duration": value}).data], [expected])

    def test_search_combines_filters(self):
        Video.objects.create(title="Different", category=self.category, video_url="https://example.com/sample.mp4", duration="4:00")
        response = self.client.get("/api/videos/search/", {"q": "Sample", "category": self.category.slug, "duration": "short", "page": 1})
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.video.pk)

    def test_empty_search(self):
        self.assertEqual(self.client.get("/api/videos/search/").data, [])

    def test_saved_filter_hides_unpublished(self):
        response = self.client.get("/api/videos/", {"ids": f"{self.video.pk},{self.hidden.pk}", "page": 1})
        self.assertEqual(response.data["count"], 1)

    def test_invalid_filters(self):
        for params in [{"duration": "invalid"}, {"ids": "abc"}, {"ids": "9" * 100}, {"ordering": "password"}, {"q": "a" * 201}]:
            self.assertEqual(self.client.get("/api/videos/", params).status_code, 400)

    def test_out_of_range_page(self):
        self.assertEqual(self.client.get("/api/videos/", {"page": 999}).status_code, 404)

    def test_vote_idempotency_switch_and_removal(self):
        visitor = str(uuid4())
        for value, likes, dislikes in [(1, 1, 0), (1, 1, 0), (-1, 0, 1), (0, 0, 0)]:
            response = self.client.post(f"{self.url}/reaction/", {"visitor_id": visitor, "value": value}, format="json")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data, {"value": value, "likes_count": likes, "dislikes_count": dislikes})
        self.assertEqual(VideoReaction.objects.count(), 0)

    def test_vote_counts_for_multiple_visitors(self):
        for value in [1, 1, -1]:
            self.client.post(f"{self.url}/reaction/", {"visitor_id": str(uuid4()), "value": value}, format="json")
        detail = self.client.get(f"{self.url}/").data
        self.assertEqual((detail["likes_count"], detail["dislikes_count"]), (2, 1))
        self.assertNotIn("visitor_id", detail)

    def test_invalid_votes(self):
        for payload in [{"visitor_id": "bad", "value": 1}, {"visitor_id": str(uuid4()), "value": 5}, {"value": 1}]:
            self.assertEqual(self.client.post(f"{self.url}/reaction/", payload, format="json").status_code, 400)

    def test_comments_require_moderation(self):
        response = self.client.post(f"{self.url}/comments/", {"name": "Reader", "body": "A useful sample.", "is_approved": True}, format="json")
        self.assertEqual(response.status_code, 201)
        comment = VideoComment.objects.get()
        self.assertFalse(comment.is_approved)
        self.assertNotIn("is_approved", response.data)
        self.assertEqual(self.client.get(f"{self.url}/comments/").data["count"], 0)
        comment.is_approved = True
        comment.save()
        self.assertEqual(self.client.get(f"{self.url}/comments/").data["count"], 1)
        self.assertEqual(self.client.get(f"{self.url}/").data["comments_count"], 1)

    def test_comment_validation(self):
        for payload in [{"name": " ", "body": "Hello"}, {"name": "Reader", "body": " "}, {"name": "Reader", "body": "x" * 2001}]:
            self.assertEqual(self.client.post(f"{self.url}/comments/", payload, format="json").status_code, 400)

    def test_comment_pagination(self):
        VideoComment.objects.bulk_create([VideoComment(video=self.video, name="Reader", body=f"Comment {index}", is_approved=True) for index in range(12)])
        self.assertEqual(len(self.client.get(f"{self.url}/comments/").data["results"]), 10)
        self.assertEqual(len(self.client.get(f"{self.url}/comments/?page=2").data["results"]), 2)

    def test_hidden_video_rejects_feedback(self):
        for endpoint, payload in [("reaction", {"visitor_id": str(uuid4()), "value": 1}), ("comments", {"name": "Reader", "body": "Hello there"})]:
            self.assertEqual(self.client.post(f"/api/videos/{self.hidden.pk}/{endpoint}/", payload, format="json").status_code, 404)
        self.assertEqual(self.client.get(f"/api/videos/{self.hidden.pk}/comments/").status_code, 404)

    def test_related_videos_match_person_across_categories_without_unrelated_fill(self):
        person = Performer.objects.create(name="Sample creator")
        other_person = Performer.objects.create(name="Sample creator two")
        self.video.performer = person
        self.video.save(update_fields=["performer"])
        same_category = Video.objects.create(title="Another film", performer=person, category=self.category, video_url="https://example.com/sample.mp4")
        other_category = Video.objects.create(title="A different category", performer=person, video_url="https://example.com/sample.mp4")
        Video.objects.create(title=self.video.title, performer=other_person, category=self.category, video_url="https://example.com/sample.mp4")
        Video.objects.create(title="No person selected", category=self.category, video_url="https://example.com/sample.mp4")
        self.hidden.performer = person
        self.hidden.save(update_fields=["performer"])

        response = self.client.get(f"{self.url}/related/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [other_category.pk, same_category.pk])
        self.assertTrue(all(item["performer"] == {"id": person.pk, "name": person.name} for item in response.data))
        self.assertEqual(self.client.get(f"{self.url}/").data["performer"], {"id": person.pk, "name": person.name})

    def test_untagged_video_has_no_unrelated_recommendations(self):
        Video.objects.create(title="Same category", category=self.category, video_url="https://example.com/sample.mp4")
        self.assertIsNone(self.client.get(f"{self.url}/").data["performer"])
        self.assertEqual(self.client.get(f"{self.url}/related/").data, [])
        page = self.client.get(f"{self.url}/related/", {"page": 1}).data
        self.assertEqual((page["count"], page["results"]), (0, []))

    def test_person_without_other_videos_has_empty_recommendations(self):
        self.video.performer = Performer.objects.create(name="Only one film")
        self.video.save(update_fields=["performer"])
        Video.objects.create(title="Different person", category=self.category, video_url="https://example.com/sample.mp4")
        self.assertEqual(self.client.get(f"{self.url}/related/").data, [])

    def test_related_pagination_shows_all_matches_ten_per_page_in_stable_order(self):
        person = Performer.objects.create(name="Sample creator")
        self.video.performer = person
        self.video.save(update_fields=["performer"])
        related = [Video.objects.create(title=f"Film {index}", performer=person, published_at=self.video.published_at, video_url="https://example.com/sample.mp4") for index in range(12)]
        with self.assertNumQueries(3):
            first = self.client.get(f"{self.url}/related/", {"page": 1, "page_size": 10}).data
        second = self.client.get(f"{self.url}/related/", {"page": 2, "page_size": 10}).data
        self.assertEqual((first["count"], second["count"]), (12, 12))
        self.assertEqual((len(first["results"]), len(second["results"])), (10, 2))
        self.assertIsNotNone(first["next"])
        self.assertIsNotNone(second["previous"])
        self.assertIsNone(second["next"])
        self.assertEqual([item["id"] for page in [first, second] for item in page["results"]], [video.pk for video in reversed(related)])
        self.assertEqual(self.client.get(f"{self.url}/related/", {"page": 3}).status_code, 404)

    def test_hidden_or_missing_video_has_no_related_endpoint(self):
        for pk in [self.hidden.pk, 99999]:
            self.assertEqual(self.client.get(f"/api/videos/{pk}/related/").status_code, 404)

    def test_deleting_person_preserves_videos_and_clears_recommendations(self):
        person = Performer.objects.create(name="Sample creator")
        self.video.performer = person
        self.video.save(update_fields=["performer"])
        person.delete()
        self.video.refresh_from_db()
        self.assertIsNone(self.video.performer_id)
        self.assertEqual(self.client.get(f"{self.url}/related/").data, [])

    def test_comment_rate_limit(self):
        for index in range(5):
            self.client.post(f"{self.url}/comments/", {"name": "Reader", "body": f"Comment {index}"}, format="json")
        self.assertEqual(self.client.post(f"{self.url}/comments/", {"name": "Reader", "body": "Another comment"}, format="json").status_code, 429)

    def test_title_sort_ignores_case(self):
        first = Video.objects.create(title="apple", video_url="https://example.com/sample.mp4")
        second = Video.objects.create(title="Banana", video_url="https://example.com/sample.mp4")
        data = self.client.get("/api/videos/", {"ordering": "title"}).data
        self.assertEqual([item["id"] for item in data][:2], [first.pk, second.pk])

    def test_migration_backfills_existing_durations(self):
        Video.objects.filter(pk=self.video.pk).update(duration_seconds=None)
        migration = import_module("videos.migrations.0002_video_feedback_and_duration")
        migration.backfill_durations(apps, SimpleNamespace(connection=connection))
        self.video.refresh_from_db()
        self.assertEqual(self.video.duration_seconds, 599)

    def test_list_feedback_counts_do_not_add_queries_per_video(self):
        Video.objects.create(title="Another sample", video_url="https://example.com/sample.mp4")
        with self.assertNumQueries(1):
            response = self.client.get("/api/videos/")
            self.assertEqual(response.status_code, 200)
