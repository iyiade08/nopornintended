"""
Django settings for the nopornintended backend.

Local development uses SQLite first. A production database such as Supabase
Postgres can be added later with environment variables.
"""

from pathlib import Path
from urllib.parse import urlparse

import environ
from botocore.config import Config

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, True),
    SECRET_KEY=(str, "django-insecure-local-dev-key-change-before-production"),
)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG")

ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=["127.0.0.1", "localhost"],
)


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "django_filters",
    "corsheaders",
    "storages",
    "videos",
    "pages",
    "submissions",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


DATABASE_URL = env("DATABASE_URL", default=None)
if DATABASE_URL:
    DATABASES = {"default": env.db("DATABASE_URL")}
    DATABASES["default"]["CONN_MAX_AGE"] = env.int(
        "DATABASE_CONN_MAX_AGE",
        default=0,
    )
    if DATABASES["default"]["ENGINE"] == "django.db.backends.postgresql":
        DATABASES["default"].setdefault("OPTIONS", {})
        DATABASES["default"]["OPTIONS"].setdefault(
            "sslmode",
            env("DATABASE_SSLMODE", default="require"),
        )
        DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = env.bool(
            "DATABASE_DISABLE_SERVER_SIDE_CURSORS",
            default=True,
        )
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Lagos"
USE_I18N = True
USE_TZ = True


STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": (
            "django.contrib.staticfiles.storage.StaticFilesStorage"
            if DEBUG
            else "whitenoise.storage.CompressedManifestStaticFilesStorage"
        ),
    },
}

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

USE_SUPABASE_STORAGE = env.bool("USE_SUPABASE_STORAGE", default=False)
SUPABASE_STORAGE_DRIVER = env("SUPABASE_STORAGE_DRIVER", default="s3").lower()

if USE_SUPABASE_STORAGE and SUPABASE_STORAGE_DRIVER == "rest":
    SUPABASE_URL = env("SUPABASE_URL").rstrip("/")
    SUPABASE_STORAGE_API_URL = env(
        "SUPABASE_STORAGE_API_URL",
        default=f"{SUPABASE_URL}/storage/v1",
    ).rstrip("/")
    SUPABASE_STORAGE_BUCKET = env("SUPABASE_STORAGE_BUCKET", default="media")
    SUPABASE_STORAGE_SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")
    SUPABASE_STORAGE_PUBLIC_URL = env(
        "SUPABASE_STORAGE_PUBLIC_URL",
        default=f"{SUPABASE_STORAGE_API_URL}/object/public/{SUPABASE_STORAGE_BUCKET}",
    ).rstrip("/")
    SUPABASE_STORAGE_TIMEOUT = env.int("SUPABASE_STORAGE_TIMEOUT", default=60)
    MEDIA_URL = f"{SUPABASE_STORAGE_PUBLIC_URL}/"

    STORAGES["default"] = {
        "BACKEND": "config.storage_backends.SupabaseRestStorage",
    }

elif USE_SUPABASE_STORAGE:
    AWS_ACCESS_KEY_ID = env("SUPABASE_S3_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = env("SUPABASE_S3_SECRET_ACCESS_KEY")
    AWS_STORAGE_BUCKET_NAME = env("SUPABASE_STORAGE_BUCKET", default="media")
    AWS_S3_ENDPOINT_URL = env("SUPABASE_S3_ENDPOINT_URL")
    AWS_S3_REGION_NAME = env("SUPABASE_S3_REGION_NAME", default="eu-west-1")
    AWS_S3_ADDRESSING_STYLE = "path"
    AWS_S3_SIGNATURE_VERSION = "s3v4"
    AWS_S3_CLIENT_CONFIG = Config(
        signature_version=AWS_S3_SIGNATURE_VERSION,
        s3={"addressing_style": AWS_S3_ADDRESSING_STYLE},
        request_checksum_calculation="when_required",
        response_checksum_validation="when_required",
    )
    AWS_QUERYSTRING_AUTH = False
    AWS_DEFAULT_ACL = None
    AWS_S3_FILE_OVERWRITE = False

    public_media_url = env("SUPABASE_STORAGE_PUBLIC_URL").rstrip("/")
    MEDIA_URL = f"{public_media_url}/"
    AWS_S3_CUSTOM_DOMAIN = urlparse(public_media_url).netloc + urlparse(
        public_media_url
    ).path

    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3.S3Storage",
    }


# Optional credentials for the manual Supabase-to-Bunny migration command.
# This does not change the storage used by admin file/thumbnail uploads.
BUNNY_STORAGE_ZONE = env("BUNNY_STORAGE_ZONE", default="")
BUNNY_STORAGE_ENDPOINT = env("BUNNY_STORAGE_ENDPOINT", default="https://storage.bunnycdn.com")
BUNNY_STORAGE_PASSWORD = env("BUNNY_STORAGE_PASSWORD", default="")
BUNNY_CDN_URL = env("BUNNY_CDN_URL", default="")
BUNNY_TRANSFER_TIMEOUT = env.int("BUNNY_TRANSFER_TIMEOUT", default=600)


REST_FRAMEWORK = {
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
)

CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
)

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=not DEBUG)
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=not DEBUG)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=not DEBUG)
