import mimetypes
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import Storage


class SupabaseRestStorage(Storage):
    """Django storage backend using Supabase Storage's REST API."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.bucket = settings.SUPABASE_STORAGE_BUCKET
        self.storage_url = settings.SUPABASE_STORAGE_API_URL.rstrip("/")
        self.public_url = settings.SUPABASE_STORAGE_PUBLIC_URL.rstrip("/")
        self.api_key = settings.SUPABASE_STORAGE_SERVICE_KEY

    def _headers(self, content_type=None):
        headers = {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
        }
        if content_type:
            headers["Content-Type"] = content_type
        return headers

    def _normalize_name(self, name):
        return str(name).replace("\\", "/").lstrip("/")

    def _object_url(self, name):
        quoted_name = quote(self._normalize_name(name), safe="/")
        return f"{self.storage_url}/object/{self.bucket}/{quoted_name}"

    def _public_object_url(self, name):
        quoted_name = quote(self._normalize_name(name), safe="/")
        return f"{self.public_url}/{quoted_name}"

    def _error_message(self, action, error):
        body = error.read().decode("utf-8", errors="replace").strip()
        detail = f": {body}" if body else ""
        return f"Supabase storage {action} failed ({error.code}){detail}"

    def _save(self, name, content):
        name = self._normalize_name(name)
        content_type = getattr(content, "content_type", None)
        content_type = content_type or mimetypes.guess_type(name)[0]
        content_type = content_type or "application/octet-stream"

        if hasattr(content, "seek"):
            content.seek(0)

        data = content.read()
        request = Request(
            self._object_url(name),
            data=data,
            headers={
                **self._headers(content_type),
                "Content-Length": str(len(data)),
                "x-upsert": "false",
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=settings.SUPABASE_STORAGE_TIMEOUT) as response:
                response.read()
        except HTTPError as error:
            # If Django generated an existing name, retry as an overwrite-safe PUT.
            if error.code != 409:
                raise RuntimeError(self._error_message("upload", error)) from error
            retry = Request(
                self._object_url(name),
                data=data,
                headers={
                    **self._headers(content_type),
                    "Content-Length": str(len(data)),
                    "x-upsert": "true",
                },
                method="POST",
            )
            try:
                with urlopen(retry, timeout=settings.SUPABASE_STORAGE_TIMEOUT) as response:
                    response.read()
            except HTTPError as retry_error:
                raise RuntimeError(
                    self._error_message("upload retry", retry_error)
                ) from retry_error

        return name

    def exists(self, name):
        request = Request(
            self._object_url(name),
            headers=self._headers(),
            method="HEAD",
        )
        try:
            with urlopen(request, timeout=settings.SUPABASE_STORAGE_TIMEOUT):
                return True
        except HTTPError as error:
            if error.code in {400, 404}:
                return False
            raise

    def delete(self, name):
        request = Request(
            self._object_url(name),
            headers=self._headers(),
            method="DELETE",
        )
        try:
            with urlopen(request, timeout=settings.SUPABASE_STORAGE_TIMEOUT) as response:
                response.read()
        except HTTPError as error:
            if error.code != 404:
                raise RuntimeError(self._error_message("delete", error)) from error

    def url(self, name):
        return self._public_object_url(name)

    def size(self, name):
        request = Request(self._public_object_url(name), method="HEAD")
        try:
            with urlopen(request, timeout=settings.SUPABASE_STORAGE_TIMEOUT) as response:
                return int(response.headers.get("Content-Length", 0))
        except HTTPError as error:
            if error.code == 404:
                raise FileNotFoundError(name)
            raise

    def _open(self, name, mode="rb"):
        if mode not in {"rb", "r"}:
            raise ValueError("SupabaseRestStorage only supports read mode.")
        try:
            with urlopen(
                self._public_object_url(name),
                timeout=settings.SUPABASE_STORAGE_TIMEOUT,
            ) as response:
                data = response.read()
        except HTTPError as error:
            if error.code == 404:
                raise FileNotFoundError(name)
            raise

        return ContentFile(data, name=self._normalize_name(name))
