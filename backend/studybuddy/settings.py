import os
import sys
from datetime import timedelta
from pathlib import Path

import dj_database_url
import sentry_sdk
from dotenv import load_dotenv
from sentry_sdk.integrations.django import DjangoIntegration

load_dotenv()

# Detect if we are testing
IS_TESTING = "pytest" in sys.modules or "test" in sys.argv

# BASE_DIR anchors database/static paths regardless of where manage.py runs.
BASE_DIR = Path(__file__).resolve().parent.parent


def _env_bool(name, default=False):
    """Read common truthy env values without being case-sensitive."""

    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def _env_list(name, default):
    """Parse comma-separated environment values, dropping blank entries."""

    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


# Production deployments should set SECRET_KEY/DEBUG/ALLOWED_HOSTS in the env.
SECRET_KEY = os.getenv(
    "SECRET_KEY", "django-insecure-change-this-before-production-please"
)
DEBUG = _env_bool("DEBUG", True)
ALLOWED_HOSTS = _env_list(
    "ALLOWED_HOSTS",
    "localhost,127.0.0.1,.onrender.com",
)


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "study_api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "studybuddy.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "studybuddy.wsgi.application"


# Determine if we are testing (defined earlier in settings)
if IS_TESTING:
    # Use an isolated local database so tests do not mutate dev/prod data.
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db_test.sqlite3",
        }
    }
else:
    # Render/Postgres can provide DATABASE_URL; local dev falls back to sqlite.
    db_url = os.environ.get("DATABASE_URL") or f"sqlite:///{BASE_DIR / 'db.sqlite3'}"
    DATABASES = {"default": dj_database_url.parse(db_url, conn_max_age=600, ssl_require=not DEBUG)}


CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "studybuddy_cache",
    }
}

CORS_ALLOWED_ORIGINS = [
    # Local React dev servers.
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://studybuddy-omega-gray.vercel.app",
]
CORS_ALLOWED_ORIGINS += _env_list("CORS_ALLOWED_ORIGINS", "")

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.vercel\.app$",
]

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = _env_list(
    "CSRF_TRUSTED_ORIGINS",
    "https://*.vercel.app,https://*.onrender.com",
)

REST_FRAMEWORK = {
    # The frontend expects JSON-only responses and bearer-token auth.
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/hour",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}


STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Groq API — free at https://console.groq.com
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# GlitchTip Error Tracking (Sentry-compatible) — DISABLED for local dev
# Set GLITCHTIP_DSN env var to enable in production. Local dev never needs error tracking.
GLITCHTIP_DSN = os.getenv("GLITCHTIP_DSN", "")
if DEBUG or not GLITCHTIP_DSN:
    pass  # no Sentry during development or when DSN is not set
else:
    try:
        sentry_sdk.init(
            dsn=GLITCHTIP_DSN,
            integrations=[DjangoIntegration()],
            traces_sample_rate=1.0,
            send_default_pii=True,
        )
    except Exception as e:  # noqa: BLE001
        print(f"[Warning] Sentry init failed: {e}", file=sys.stderr)
