import hashlib
import io
import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch
from urllib.error import HTTPError

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, TestCase, override_settings

from .bunny_migration import (
    CHUNK_SIZE, BunnyConfig, BunnyDestination, HTTPTransfer, NoRedirect,
    SupabaseSource, TransferError, copy_stream, object_key, source_key,
)
from .models import Category, Performer, Video, VideoComment


CONFIG = {
    "BUNNY_STORAGE_ZONE": "test-videos",
    "BUNNY_STORAGE_ENDPOINT": "https://storage.bunnycdn.com",
    "BUNNY_STORAGE_PASSWORD": "test-zone-password",
    "BUNNY_CDN_URL": "https://test-videos.b-cdn.net",
    "BUNNY_TRANSFER_TIMEOUT": 20,
    "USE_SUPABASE_STORAGE": True,
    "SUPABASE_STORAGE_DRIVER": "rest",
    "SUPABASE_STORAGE_API_URL": "https://source.supabase.co/storage/v1",
    "SUPABASE_STORAGE_PUBLIC_URL": "https://source.supabase.co/storage/v1/object/public/media",
    "SUPABASE_STORAGE_BUCKET": "media",
    "SUPABASE_STORAGE_SERVICE_KEY": "test-source-key",
}
DATA = b"\x00\x00\x00\x18ftypmp42" + b"sample bytes" * 10
DIGEST = hashlib.sha256(DATA).hexdigest()
COMMAND = "videos.management.commands.migrate_videos_to_bunny"


class Response(io.BytesIO):
    def __init__(self, data=b"", *, status=200, headers=None):
        super().__init__(data)
        self.status = status
        self.headers = headers or {}


@override_settings(**CONFIG)
class MigrationProtocolTests(SimpleTestCase):
    def test_streaming_is_bounded_and_detects_incomplete_files(self):
        stream = Mock()
        stream.read.side_effect = [b"abc", b"def", b""]
        output = io.BytesIO()
        self.assertEqual(copy_stream(stream, output, expected_size=6), (6, hashlib.sha256(b"abcdef").hexdigest()))
        self.assertEqual(output.getvalue(), b"abcdef")
        self.assertTrue(all(call.args == (CHUNK_SIZE,) for call in stream.read.call_args_list))
        for data, size in [(b"", None), (b"short", 10)]:
            with self.subTest(size=size), self.assertRaises(TransferError):
                copy_stream(io.BytesIO(data), expected_size=size)

    def test_config_rejects_unsafe_destinations_and_hides_password(self):
        self.assertNotIn(CONFIG["BUNNY_STORAGE_PASSWORD"], repr(BunnyConfig.load(apply=True)))
        for changes in [
            {"BUNNY_STORAGE_ENDPOINT": "https://other.example.com"},
            {"BUNNY_STORAGE_ENDPOINT": "https://storage.bunnycdn.com/wrong"},
            {"BUNNY_CDN_URL": "http://test-videos.b-cdn.net"},
            {"BUNNY_CDN_URL": "https://user:secret@test-videos.b-cdn.net"},
            {"BUNNY_CDN_URL": "https://test-videos.b-cdn.net?token=secret"},
            {"BUNNY_STORAGE_ZONE": "../bad"},
            {"BUNNY_TRANSFER_TIMEOUT": 0},
        ]:
            with self.subTest(changes=changes), override_settings(**changes), self.assertRaises(TransferError):
                BunnyConfig.load(apply=True)

    def test_preview_does_not_require_password(self):
        with override_settings(BUNNY_STORAGE_PASSWORD=""):
            BunnyConfig.load()
            with self.assertRaises(TransferError):
                BunnyConfig.load(apply=True)

    def test_object_keys_cannot_escape_the_bucket(self):
        for key in ["../x.mp4", "videos/../x.mp4", "/x.mp4", "videos\\x.mp4", "videos//x.mp4", "a\n.mp4"]:
            with self.subTest(key=key), self.assertRaises(TransferError):
                object_key(key)
        self.assertEqual(object_key("videos/name 100%.mp4"), "videos/name 100%.mp4")

    def test_url_only_sources_are_limited_to_configured_supabase_bucket(self):
        base = CONFIG["SUPABASE_STORAGE_PUBLIC_URL"]
        video = Video(video_url=f"{base}/videos/name%20100%25.mp4")
        self.assertEqual(source_key(video), "videos/name 100%.mp4")
        for url in ["https://other.example.com/file.mp4", f"{base}2/file.mp4", "https://test-videos.b-cdn.net/file.mp4"]:
            video.video_url = url
            self.assertIsNone(source_key(video))
        video.video_file = "videos/original.mp4"
        self.assertEqual(source_key(video), "videos/original.mp4")

    def test_authenticated_rest_download_streams_and_escapes_names(self):
        source = SupabaseSource(20)
        response = Response(DATA, headers={"Content-Length": str(len(DATA)), "Content-Type": "video/mp4"})
        with patch.object(source.http, "open", return_value=response) as request:
            output = io.BytesIO()
            self.assertEqual(source.copy_to("videos/name 100%.mp4", output), (len(DATA), DIGEST, "video/mp4"))
            self.assertEqual(output.getvalue(), DATA)
        sent = request.call_args.args[0]
        self.assertEqual(sent.full_url, "https://source.supabase.co/storage/v1/object/authenticated/media/videos/name%20100%25.mp4")
        self.assertEqual(sent.get_header("Authorization"), "Bearer test-source-key")

    def test_partial_sources_and_error_documents_are_rejected(self):
        source = SupabaseSource(20)
        for response in [Response(DATA, status=206), Response(b"Quota exceeded", headers={"Content-Type": "text/html"})]:
            with self.subTest(status=response.status), patch.object(source.http, "open", return_value=response), self.assertRaises(TransferError):
                source.copy_to("videos/test.mp4", io.BytesIO())

    def test_s3_source_streams_through_the_configured_client(self):
        from botocore.config import Config
        with override_settings(SUPABASE_STORAGE_DRIVER="s3", AWS_STORAGE_BUCKET_NAME="media", AWS_S3_ENDPOINT_URL="https://source.supabase.co/storage/v1/s3", AWS_ACCESS_KEY_ID="test", AWS_SECRET_ACCESS_KEY="test", AWS_S3_REGION_NAME="eu-west-1", AWS_S3_CLIENT_CONFIG=Config()), patch("boto3.client") as factory:
            factory.return_value.get_object.return_value = {"Body": Response(DATA), "ContentLength": len(DATA), "ContentType": "video/mp4"}
            source = SupabaseSource(20)
            output = io.BytesIO()
            self.assertEqual(source.copy_to("videos/test.mp4", output), (len(DATA), DIGEST, "video/mp4"))
            source.close()
            factory.return_value.get_object.assert_called_once_with(Bucket="media", Key="videos/test.mp4")
            factory.return_value.close.assert_called_once()

    def test_local_storage_cannot_be_mistaken_for_supabase(self):
        with override_settings(USE_SUPABASE_STORAGE=False), self.assertRaises(TransferError):
            SupabaseSource(20)

    def test_http_errors_are_redacted_and_credentials_cannot_follow_redirects(self):
        http = HTTPTransfer(20)
        for status, retryable in [(401, False), (403, False), (429, True), (503, True)]:
            error = HTTPError("https://storage.bunnycdn.com/file", status, "secret", {}, io.BytesIO(b"SECRET BODY"))
            with self.subTest(status=status), patch.object(http.opener, "open", side_effect=error), self.assertRaises(TransferError) as raised:
                http.open(Mock(), "Bunny upload")
            self.assertEqual(raised.exception.retryable, retryable)
            self.assertNotIn("SECRET", str(raised.exception))
        error = HTTPError("https://storage.bunnycdn.com/file", 404, "missing", {}, None)
        with patch.object(http.opener, "open", side_effect=error):
            self.assertIsNone(http.open(Mock(), "Bunny verification", missing_ok=True))
        self.assertIsNone(NoRedirect().redirect_request(None, None, 302, None, {}, "https://other.example.com"))

    def test_upload_sends_raw_stream_length_and_uppercase_checksum(self):
        client = BunnyDestination(BunnyConfig.load(apply=True))
        stream = io.BytesIO(DATA)
        with patch.object(client, "stored_digest", side_effect=[None, (len(DATA), DIGEST)]), patch.object(client.http, "open", return_value=Response(status=201)) as request:
            self.assertEqual(client.ensure_copy("file.mp4", stream, len(DATA), DIGEST, "video/mp4"), "uploaded")
        sent = request.call_args.args[0]
        self.assertIs(sent.data, stream)
        self.assertEqual(sent.get_method(), "PUT")
        self.assertEqual(sent.get_header("Accesskey"), CONFIG["BUNNY_STORAGE_PASSWORD"])
        self.assertEqual(sent.get_header("Checksum"), DIGEST.upper())
        self.assertEqual(sent.get_header("Content-length"), str(len(DATA)))

    def test_service_restriction_stops_the_batch_without_exposing_response_body(self):
        http = HTTPTransfer(20)
        error = HTTPError("https://source.supabase.co/file", 402, "restricted", {}, io.BytesIO(b"PRIVATE RESPONSE"))
        with patch.object(http.opener, "open", side_effect=error), self.assertRaises(TransferError) as raised:
            http.open(Mock(), "Supabase download")
        self.assertTrue(raised.exception.stop_batch)
        self.assertFalse(raised.exception.retryable)
        self.assertIn("Usage/Billing", str(raised.exception))
        self.assertNotIn("PRIVATE", str(raised.exception))

    def test_existing_verified_copies_are_reused_but_other_content_is_not_overwritten(self):
        client = BunnyDestination(BunnyConfig.load())
        with patch.object(client, "stored_digest", return_value=(len(DATA), DIGEST)), patch.object(client.http, "open") as request:
            self.assertEqual(client.ensure_copy("file.mp4", io.BytesIO(DATA), len(DATA), DIGEST, "video/mp4"), "reused")
            request.assert_not_called()
        with patch.object(client, "stored_digest", return_value=(1, "different")), patch.object(client.http, "open") as request, self.assertRaises(TransferError):
            client.ensure_copy("file.mp4", io.BytesIO(DATA), len(DATA), DIGEST, "video/mp4")
        request.assert_not_called()

    def test_upload_readback_must_match_source(self):
        client = BunnyDestination(BunnyConfig.load())
        with patch.object(client, "stored_digest", side_effect=[None, (len(DATA), "wrong")]), patch.object(client.http, "open", return_value=Response(status=201)), self.assertRaises(TransferError):
            client.ensure_copy("file.mp4", io.BytesIO(DATA), len(DATA), DIGEST, "video/mp4")

    def test_cdn_probe_checks_range_total_bytes_and_cors(self):
        client = BunnyDestination(BunnyConfig.load())
        headers = {"Content-Range": f"bytes 0-31/{len(DATA)}", "Access-Control-Allow-Origin": "*"}
        with patch.object(client.http, "open", return_value=Response(DATA[:32], status=206, headers=headers)):
            client.verify_public("file.mp4", len(DATA), DATA[:32])
        for response in [
            Response(DATA[:32], status=200, headers=headers),
            Response(DATA[:32], status=206, headers={**headers, "Content-Range": "bytes 0-31/999"}),
            Response(b"wrong", status=206, headers=headers),
            Response(DATA[:32], status=206, headers={"Content-Range": headers["Content-Range"]}),
        ]:
            with self.subTest(status=response.status), patch.object(client.http, "open", return_value=response), self.assertRaises(TransferError):
                client.verify_public("file.mp4", len(DATA), DATA[:32])


@override_settings(**CONFIG)
class MigrationCommandTests(TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.report = Path(directory.name) / "recovery.jsonl"
        self.video = Video.objects.create(title="Sample", video_file="videos/sample.mp4", video_url="https://old.example.com/fallback.mp4", thumbnail="thumbnails/sample.jpg", views_count=12, downloads_count=3)
        self.source_class = self.start_patch(f"{COMMAND}.SupabaseSource")
        self.destination_class = self.start_patch(f"{COMMAND}.BunnyDestination")
        self.start_patch("videos.bunny_migration.HTTPTransfer.open", side_effect=AssertionError("Unexpected network access"))
        self.source = self.source_class.return_value
        self.source.copy_to.side_effect = self.copy_source
        self.destination = self.destination_class.return_value
        self.destination.ensure_copy.return_value = "uploaded"

    def start_patch(self, target, **kwargs):
        patcher = patch(target, **kwargs)
        self.addCleanup(patcher.stop)
        return patcher.start()

    @staticmethod
    def copy_source(key, output):
        output.write(DATA)
        return len(DATA), DIGEST, "video/mp4"

    def run_command(self, **kwargs):
        output, error = io.StringIO(), io.StringIO()
        call_command("migrate_videos_to_bunny", stdout=output, stderr=error, report=str(self.report), **kwargs)
        return output.getvalue(), error.getvalue()

    def test_default_preview_has_no_transfer_report_or_database_write(self):
        with override_settings(BUNNY_STORAGE_PASSWORD=""):
            output, _ = self.run_command()
        self.assertIn("PREVIEW", output)
        self.assertIn("videos/sample.mp4", output)
        self.source_class.assert_not_called()
        self.destination_class.assert_not_called()
        self.assertFalse(self.report.exists())
        self.video.refresh_from_db()
        self.assertEqual(self.video.video_file.name, "videos/sample.mp4")

    def test_success_keeps_content_counts_relations_thumbnail_and_source(self):
        person = Performer.objects.create(name="Sample person")
        category = Category.objects.create(name="Featured")
        self.video.performer, self.video.category = person, category
        self.video.save()
        comment = VideoComment.objects.create(video=self.video, name="Reader", body="A comment")
        self.run_command(apply=True)
        self.video.refresh_from_db()
        self.assertFalse(self.video.video_file)
        self.assertEqual(self.video.video_url, f"https://test-videos.b-cdn.net/migrated/videos/{self.video.pk}/{DIGEST}.mp4")
        self.assertEqual((self.video.title, self.video.performer, self.video.category, self.video.views_count, self.video.downloads_count, self.video.thumbnail.name), ("Sample", person, category, 12, 3, "thumbnails/sample.jpg"))
        self.assertTrue(VideoComment.objects.filter(pk=comment.pk, video=self.video).exists())
        self.source.delete.assert_not_called()
        events = [json.loads(line) for line in self.report.read_text().splitlines()]
        self.assertEqual([event["event"] for event in events], ["verified_before_update", "updated"])
        self.assertEqual(events[0]["previous_video_file"], "videos/sample.mp4")
        self.assertEqual(events[0]["previous_video_url"], "https://old.example.com/fallback.mp4")
        self.assertNotIn(CONFIG["BUNNY_STORAGE_PASSWORD"], self.report.read_text())

    def test_resume_skips_migrated_and_other_external_videos(self):
        Video.objects.create(title="Already on Bunny", video_url="https://test-videos.b-cdn.net/existing.mp4")
        Video.objects.create(title="Other external", video_url="https://other.example.com/file.mp4")
        self.run_command(apply=True)
        self.run_command(apply=True)
        self.assertEqual(self.source.copy_to.call_count, 1)

    def test_limits_ids_and_unpublished_content(self):
        second = Video.objects.create(title="Unpublished", video_file="videos/second.mp4", is_published=False)
        self.run_command(apply=True, ids=[second.pk], limit=1)
        self.video.refresh_from_db()
        second.refresh_from_db()
        self.assertTrue(self.video.video_file)
        self.assertFalse(second.video_file)
        self.assertFalse(second.is_published)
        self.assertEqual(self.source.copy_to.call_count, 1)

    def test_supabase_url_only_entries_are_also_migrated(self):
        self.video.video_file = None
        self.video.video_url = CONFIG["SUPABASE_STORAGE_PUBLIC_URL"] + "/videos/name%20with%20space.mp4"
        self.video.save()
        self.run_command(apply=True)
        self.video.refresh_from_db()
        self.assertTrue(self.video.video_url.startswith(CONFIG["BUNNY_CDN_URL"]))
        self.assertEqual(self.source.copy_to.call_args.args[0], "videos/name with space.mp4")

    def test_failed_verification_keeps_old_links_and_continues(self):
        second = Video.objects.create(title="Second", video_file="videos/second.mp4")
        self.destination.verify_public.side_effect = [TransferError("Checksum mismatch"), None]
        with self.assertRaises(CommandError):
            self.run_command(apply=True)
        self.video.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual(self.video.video_file.name, "videos/sample.mp4")
        self.assertEqual(self.video.video_url, "https://old.example.com/fallback.mp4")
        self.assertFalse(second.video_file)
        self.assertIn('"event": "failed"', self.report.read_text())

    def test_temporary_failures_retry(self):
        attempts = iter([True, False])
        def transfer(key, output):
            if next(attempts):
                raise TransferError("Temporary", retryable=True)
            return self.copy_source(key, output)
        self.source.copy_to.side_effect = transfer
        with patch(f"{COMMAND}.time.sleep"):
            self.run_command(apply=True)
        self.assertEqual(self.source.copy_to.call_count, 2)
        self.assertEqual(self.destination.verify_public.call_count, 1)

    def test_provider_restriction_keeps_all_links_and_stops_further_requests(self):
        second = Video.objects.create(title="Second", video_file="videos/second.mp4")
        self.source.copy_to.side_effect = TransferError("Supabase account restricted", stop_batch=True)
        with self.assertRaises(CommandError):
            self.run_command(apply=True)
        self.video.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual(self.video.video_file.name, "videos/sample.mp4")
        self.assertEqual(second.video_file.name, "videos/second.mp4")
        self.assertEqual(self.source.copy_to.call_count, 1)
        self.destination.ensure_copy.assert_not_called()

    def test_concurrent_admin_edit_is_not_overwritten(self):
        def transfer(key, output):
            Video.objects.filter(pk=self.video.pk).update(video_url="https://new.example.com/new.mp4")
            return self.copy_source(key, output)
        self.source.copy_to.side_effect = transfer
        with self.assertRaises(CommandError):
            self.run_command(apply=True)
        self.video.refresh_from_db()
        self.assertEqual(self.video.video_url, "https://new.example.com/new.mp4")
        self.assertEqual(self.video.video_file.name, "videos/sample.mp4")

    def test_recovery_report_failure_prevents_switching_links(self):
        with patch(f"{COMMAND}.os.fsync", side_effect=OSError("disk full")), self.assertRaises(CommandError):
            self.run_command(apply=True)
        self.video.refresh_from_db()
        self.assertEqual(self.video.video_file.name, "videos/sample.mp4")

    def test_invalid_options_fail_before_transfers(self):
        for options in [{"limit": 0}, {"limit": -1}, {"retries": -1}, {"ids": [-2]}]:
            with self.subTest(options=options), self.assertRaises(CommandError):
                self.run_command(**options)
        self.source_class.assert_not_called()
