"""Streaming transfers used only by the explicit migration management command."""

import hashlib
import re
from dataclasses import dataclass, field
from http.client import HTTPException
from urllib.error import HTTPError, URLError
from urllib.parse import quote, unquote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator


CHUNK_SIZE = 1024 * 1024


class TransferError(Exception):
    def __init__(self, message, *, retryable=False, stop_batch=False):
        super().__init__(message)
        self.retryable = retryable
        self.stop_batch = stop_batch


class NoRedirect(HTTPRedirectHandler):
    # Never forward storage credentials to a redirect destination.
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def https_base(value, label):
    value = value.strip().rstrip("/")
    try:
        URLValidator(schemes=["https"])(value)
        parsed = urlsplit(value)
        if parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError
    except (ValidationError, ValueError):
        raise TransferError(f"{label} must be an HTTPS URL without credentials or query parameters.") from None
    return value


def object_key(value):
    # Preserve real object names, including spaces and percent signs, without
    # allowing a stored name to escape its bucket or become a URL.
    if not value or value.startswith("/") or "\\" in value or any(
        part in {"", ".", ".."} for part in value.split("/")
    ) or any(ord(char) < 32 for char in value):
        raise TransferError("Invalid source object path; inspect this video's file reference.")
    return value


def source_key(video):
    if video.video_file:
        return object_key(video.video_file.name)
    base = getattr(settings, "SUPABASE_STORAGE_PUBLIC_URL", "") or settings.MEDIA_URL
    try:
        root = urlsplit(base)
        candidate = urlsplit(video.video_url)
    except ValueError:
        raise TransferError("Invalid source video URL; inspect this video's reference.") from None
    if root.scheme != "https" or candidate.scheme != "https" or not root.netloc:
        return None
    if candidate.netloc != root.netloc or candidate.username or candidate.password:
        return None
    prefix = unquote(root.path).rstrip("/") + "/"
    path = unquote(candidate.path)
    if not path.startswith(prefix):
        return None
    return object_key(path[len(prefix):])


def copy_stream(stream, output=None, *, expected_size=None):
    digest = hashlib.sha256()
    size = 0
    while True:
        chunk = stream.read(CHUNK_SIZE)
        if not chunk:
            break
        digest.update(chunk)
        size += len(chunk)
        if output is not None:
            output.write(chunk)
    if not size or (expected_size is not None and size != expected_size):
        raise TransferError("The transferred file is empty or incomplete.", retryable=True)
    return size, digest.hexdigest()


class HTTPTransfer:
    def __init__(self, timeout):
        self.timeout = timeout
        self.opener = build_opener(NoRedirect())

    def open(self, request, label, *, missing_ok=False):
        try:
            return self.opener.open(request, timeout=self.timeout)
        except HTTPError as error:
            status = error.code
            error.close()
            if missing_ok and status == 404:
                return None
            if status == 402:
                raise TransferError(
                    f"{label} is blocked by a provider service restriction (HTTP 402). "
                    "Check the provider's Usage/Billing page or contact its support about restoring export access before retrying.",
                    stop_batch=True,
                ) from None
            # Do not expose provider response bodies, signed URLs or headers.
            raise TransferError(
                f"{label} returned HTTP {status}. Check credentials, region, access and provider limits.",
                retryable=status == 429 or status >= 500,
            ) from None
        except (URLError, OSError, HTTPException):
            raise TransferError(f"{label} could not connect or timed out.", retryable=True) from None


@dataclass(frozen=True)
class BunnyConfig:
    zone: str
    endpoint: str
    cdn: str
    password: str = field(repr=False)
    timeout: int = 600

    @classmethod
    def load(cls, *, apply=False):
        zone = settings.BUNNY_STORAGE_ZONE.strip()
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9-]*", zone):
            raise TransferError("Set BUNNY_STORAGE_ZONE in the backend .env file.")
        endpoint = https_base(settings.BUNNY_STORAGE_ENDPOINT, "BUNNY_STORAGE_ENDPOINT")
        parsed = urlsplit(endpoint)
        if parsed.path or parsed.port or not re.fullmatch(
            r"(?:[a-z]{2,3}\.)?storage\.bunnycdn\.com", parsed.hostname or ""
        ):
            raise TransferError("Use the Bunny Storage HTTPS endpoint shown in the zone's Access tab.")
        cdn = https_base(settings.BUNNY_CDN_URL, "BUNNY_CDN_URL")
        password = settings.BUNNY_STORAGE_PASSWORD
        if apply and (not password or password.startswith("replace-with")):
            raise TransferError("Set BUNNY_STORAGE_PASSWORD to the storage-zone password from Bunny's Access tab.")
        timeout = settings.BUNNY_TRANSFER_TIMEOUT
        if timeout <= 0:
            raise TransferError("BUNNY_TRANSFER_TIMEOUT must be positive.")
        return cls(zone, endpoint, cdn, password, timeout)

    def target_key(self, video_id, key, digest):
        suffix = key.rsplit("/", 1)[-1].rsplit(".", 1)
        extension = "." + suffix[-1].lower() if len(suffix) == 2 else ""
        if extension and not re.fullmatch(r"\.[a-z0-9]{1,10}", extension):
            extension = ""
        # Content-addressed destinations avoid overwriting existing user files
        # and stay short enough for the model's existing URLField.
        return f"migrated/videos/{video_id}/{digest}{extension}"

    def public_url(self, key):
        return f"{self.cdn}/{quote(key, safe='/')}"


class SupabaseSource:
    def __init__(self, timeout):
        if not settings.USE_SUPABASE_STORAGE:
            raise TransferError("USE_SUPABASE_STORAGE must remain True during this migration.")
        self.timeout = timeout
        self.driver = settings.SUPABASE_STORAGE_DRIVER
        self.http = HTTPTransfer(timeout)
        self.s3 = None
        if self.driver == "rest":
            self.api = https_base(settings.SUPABASE_STORAGE_API_URL, "SUPABASE_STORAGE_API_URL")
            self.bucket = settings.SUPABASE_STORAGE_BUCKET
            self.key = settings.SUPABASE_STORAGE_SERVICE_KEY
        elif self.driver == "s3":
            import boto3

            self.bucket = settings.AWS_STORAGE_BUCKET_NAME
            self.s3 = boto3.client(
                "s3",
                endpoint_url=settings.AWS_S3_ENDPOINT_URL,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME,
                config=settings.AWS_S3_CLIENT_CONFIG,
            )
        else:
            raise TransferError("The source must use the configured Supabase REST or S3 storage driver.")

    def copy_to(self, key, output):
        key = object_key(key)
        if self.s3 is not None:
            from botocore.exceptions import BotoCoreError, ClientError

            try:
                response = self.s3.get_object(Bucket=self.bucket, Key=key)
                with response["Body"] as stream:
                    return self._copy(stream, output, response.get("ContentLength"), response.get("ContentType", ""))
            except ClientError as error:
                status = error.response.get("ResponseMetadata", {}).get("HTTPStatusCode", 0)
                raise TransferError(f"Supabase S3 download returned HTTP {status}.", retryable=status == 429 or status >= 500) from None
            except BotoCoreError:
                raise TransferError("Supabase S3 download failed; check storage access.", retryable=True) from None
        url = f"{self.api}/object/authenticated/{quote(self.bucket, safe='')}/{quote(key, safe='/')}"
        request = Request(url, headers={"apikey": self.key, "Authorization": f"Bearer {self.key}", "Accept-Encoding": "identity"})
        with self.http.open(request, "Supabase download") as response:
            if response.status != 200 or response.headers.get("Content-Range"):
                raise TransferError("Supabase did not return a complete source file.", retryable=True)
            length = response.headers.get("Content-Length")
            return self._copy(response, output, int(length) if length else None, response.headers.get("Content-Type", ""))

    @staticmethod
    def _copy(stream, output, size, content_type):
        mime = content_type.split(";", 1)[0].strip().lower()
        if mime.startswith("text/") or mime in {"application/json", "application/xml"}:
            raise TransferError("Supabase returned a text/error document instead of a video file.")
        total, digest = copy_stream(stream, output, expected_size=size)
        return total, digest, mime

    def close(self):
        if self.s3 is not None:
            self.s3.close()


class BunnyDestination:
    def __init__(self, config):
        self.config = config
        self.http = HTTPTransfer(config.timeout)

    def _request(self, key, **kwargs):
        headers = kwargs.pop("headers", {})
        return Request(
            f"{self.config.endpoint}/{quote(self.config.zone, safe='')}/{quote(key, safe='/')}",
            headers={"AccessKey": self.config.password, "Accept-Encoding": "identity", **headers},
            **kwargs,
        )

    def stored_digest(self, key):
        response = self.http.open(self._request(key), "Bunny verification", missing_ok=True)
        if response is None:
            return None
        with response:
            length = response.headers.get("Content-Length")
            return copy_stream(response, expected_size=int(length) if length else None)

    def ensure_copy(self, key, stream, size, digest, content_type):
        existing = self.stored_digest(key)
        if existing is not None:
            if existing != (size, digest):
                raise TransferError("A different file already exists at this Bunny destination; no overwrite was attempted.")
            return "reused"
        stream.seek(0)
        request = self._request(key, method="PUT", data=stream, headers={
            "Content-Type": content_type or "application/octet-stream",
            "Content-Length": str(size),
            "Checksum": digest.upper(),
        })
        with self.http.open(request, "Bunny upload") as response:
            if response.status not in {200, 201}:
                raise TransferError("Bunny did not confirm the upload.")
        if self.stored_digest(key) != (size, digest):
            raise TransferError("Bunny's downloaded copy did not match the source checksum.", retryable=True)
        return "uploaded"

    def verify_public(self, key, size, first_bytes):
        end = len(first_bytes) - 1
        request = Request(self.config.public_url(key), headers={
            "Range": f"bytes=0-{end}",
            "Origin": "http://localhost:5173",
            "Accept-Encoding": "identity",
        })
        with self.http.open(request, "Bunny CDN check") as response:
            expected_range = f"bytes 0-{end}/{size}"
            if response.status != 206 or response.headers.get("Content-Range") != expected_range:
                raise TransferError("The CDN did not serve the expected byte range; the database link was not changed.", retryable=True)
            if response.read(len(first_bytes) + 1) != first_bytes:
                raise TransferError("The CDN response does not match the copied file.", retryable=True)
            if response.headers.get("Access-Control-Allow-Origin") != "*":
                raise TransferError("Enable CORS with Access-Control-Allow-Origin: * on the Bunny pull zone before retrying.")
