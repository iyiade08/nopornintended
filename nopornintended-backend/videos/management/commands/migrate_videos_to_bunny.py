import json
import os
import tempfile
import time
from http.client import HTTPException
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import DatabaseError
from django.utils import timezone

from videos.bunny_migration import BunnyConfig, BunnyDestination, SupabaseSource, TransferError, source_key
from videos.models import Video


class Command(BaseCommand):
    help = "Preview or copy Supabase-hosted videos to Bunny and update verified video links. Never deletes source files."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Copy files and update links. Without this flag, only preview database references.")
        parser.add_argument("--limit", type=int, help="Process at most this many eligible videos (use 1 for the first test).")
        parser.add_argument("--ids", nargs="+", type=int, help="Only process these video IDs.")
        parser.add_argument("--retries", type=int, default=2, help="Retries per video after temporary network errors (default: 2).")
        parser.add_argument("--report", help="Append recovery records to this JSONL file. Default: migration-reports/bunny-videos-<time>.jsonl.")

    def handle(self, *args, **options):
        if options["limit"] is not None and options["limit"] <= 0:
            raise CommandError("--limit must be positive.")
        if options["retries"] < 0:
            raise CommandError("--retries cannot be negative.")
        if options["ids"] and any(value <= 0 for value in options["ids"]):
            raise CommandError("--ids must contain positive video IDs.")
        try:
            config = BunnyConfig.load(apply=options["apply"])
        except TransferError as error:
            raise CommandError(str(error)) from None
        videos = Video.objects.order_by("pk")
        if options["ids"]:
            videos = videos.filter(pk__in=options["ids"])
        self.stdout.write(f"Mode: {'APPLY' if options['apply'] else 'PREVIEW (no transfers or changes)'}")
        self.stdout.write(f"Destination: {config.zone} via {config.cdn}")
        if not options["apply"]:
            count = 0
            for video in videos.iterator(chunk_size=100):
                try:
                    key = source_key(video)
                except TransferError as error:
                    self.stderr.write(f"Video {video.pk}: {error}")
                    continue
                if key is None:
                    continue
                count += 1
                self.stdout.write(f"Video {video.pk}: {key}")
                if options["limit"] and count >= options["limit"]:
                    break
            self.stdout.write(f"Eligible videos in this preview: {count}. Thumbnails and other external URLs are unchanged.")
            self.stdout.write("Next: run with --apply --limit 1, test that video, then run with --apply for the remainder.")
            return
        # The source is constructed before creating the report, and the report
        # is opened before any upload or database update is possible.
        try:
            source = SupabaseSource(config.timeout)
        except TransferError as error:
            raise CommandError(str(error)) from None
        stamp = timezone.now().strftime("%Y%m%dT%H%M%S%fZ")
        report_path = Path(options["report"]) if options["report"] else settings.BASE_DIR / "migration-reports" / f"bunny-videos-{stamp}.jsonl"
        try:
            report_path.parent.mkdir(parents=True, exist_ok=True)
            with report_path.open("a", encoding="utf-8") as report:
                self.stdout.write(f"Recovery report: {report_path.resolve()}")
                self._apply(videos, source, BunnyDestination(config), config, report, options)
        except OSError:
            raise CommandError("The migration report could not be written. Check disk space and the report path; inspect the report before retrying.") from None
        finally:
            source.close()

    @staticmethod
    def _record(report, event):
        report.write(json.dumps({"at": timezone.now().isoformat(), **event}) + "\n")
        report.flush()
        os.fsync(report.fileno())

    def _apply(self, videos, source, destination, config, report, options):
        migrated = failed = processed = skipped = 0
        for video in videos.iterator(chunk_size=100):
            try:
                key = source_key(video)
                if key is None:
                    skipped += 1
                    continue
                processed += 1
                self.stdout.write(f"Video {video.pk}: copying and verifying...")
                for attempt in range(options["retries"] + 1):
                    try:
                        self._migrate(video, key, source, destination, config, report)
                        break
                    except TransferError as error:
                        if not error.retryable or attempt >= options["retries"]:
                            raise
                        self.stdout.write(f"Video {video.pk}: temporary failure; retry {attempt + 1}/{options['retries']}.")
                        time.sleep(min(2 ** attempt, 4))
                migrated += 1
                self.stdout.write(self.style.SUCCESS(f"Video {video.pk}: verified; database link updated."))
            except (TransferError, ValidationError) as error:
                failed += 1
                self._record(report, {"event": "failed", "video_id": video.pk, "error": str(error)})
                self.stderr.write(f"Video {video.pk}: {error}")
                if isinstance(error, TransferError) and error.stop_batch:
                    self.stderr.write("Stopped the batch because the provider is restricting access. No further videos were attempted.")
                    break
            if options["limit"] and processed >= options["limit"]:
                break
        self.stdout.write(f"Migrated: {migrated}; failed: {failed}; already external/unassigned: {skipped}.")
        self.stdout.write("Supabase originals and thumbnails were kept. Rerun the command to process remaining eligible videos.")
        if failed:
            raise CommandError("Some videos were not migrated. Their references were kept; review the report and retry after fixing the cause.")

    def _migrate(self, video, key, source, destination, config, report):
        with tempfile.TemporaryFile() as temporary:
            try:
                size, digest, mime = source.copy_to(key, temporary)
                target = config.target_key(video.pk, key, digest)
                url = config.public_url(target)
                Video._meta.get_field("video_url").clean(url, video)
                outcome = destination.ensure_copy(target, temporary, size, digest, mime)
                temporary.seek(0)
                destination.verify_public(target, size, temporary.read(min(size, 32)))
            except (OSError, HTTPException):
                raise TransferError("Transfer interrupted. Check network access and free temporary disk space.", retryable=True) from None
        snapshot = {
            "video_id": video.pk,
            "source_key": key,
            "previous_video_file": video.video_file.name,
            "previous_video_url": video.video_url,
            "target_key": target,
            "target_url": url,
            "size": size,
            "sha256": digest,
            "copy": outcome,
        }
        # Make the old references durable BEFORE changing the database. The
        # conditional update protects a video edited while its file was copied.
        self._record(report, {"event": "verified_before_update", **snapshot})
        try:
            changed = Video.objects.filter(
                pk=video.pk,
                video_file=video.video_file.name,
                video_url=video.video_url,
                updated_at=video.updated_at,
            ).update(video_file="", video_url=url, updated_at=timezone.now())
        except DatabaseError:
            raise CommandError("The database update could not be confirmed. The original links are in the recovery report; check the record and retry after restoring the database connection.") from None
        if changed != 1:
            raise TransferError("This video's record changed during transfer; its link was not overwritten. Retry using the current record.")
        self._record(report, {"event": "updated", **snapshot})
