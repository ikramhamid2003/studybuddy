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
    "drf_spectacular",
    "corsheaders",
    "study_api.apps.StudyApiConfig",
    "rest_framework_simplejwt.token_blacklist",
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
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_THROTTLE_CLASSES": [
        "study_api.throttles.StudyBuddyAnonRateThrottle",
        "study_api.throttles.StudyBuddyUserRateThrottle",
        "study_api.throttles.ActionRateThrottle",
    ],
    # Global + per-action ceilings are env-configurable so a deployment can
    # tighten expensive LLM/RAG routes without a code change.
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("THROTTLE_ANON_RATE", "60/hour"),
        "user": os.getenv("THROTTLE_USER_RATE", "300/hour"),
        "generate": os.getenv("THROTTLE_GENERATE_RATE", "60/hour"),
        "rag": os.getenv("THROTTLE_RAG_RATE", "40/hour"),
        "chat": os.getenv("THROTTLE_CHAT_RATE", "90/hour"),
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "StudyBuddy API",
    "DESCRIPTION": (
        "StudyBuddy backend. Operations use explicit resource-based REST "
        "endpoints (e.g. POST /api/generate/, GET /api/sessions/); RAG file "
        "upload uses POST /api/rag/upload/."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
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
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
TYPESAFE_API_KEY = os.getenv("TYPESAFE_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# Per-million-token rates used to turn recorded usage into an estimated cost.
# They default to zero on purpose: Groq prices vary by model and change over
# time, so a hardcoded guess would silently report wrong numbers. Set both to
# the current rate for GROQ_MODEL to get a real cost estimate.
GROQ_PRICE_PER_M_INPUT = float(os.getenv("GROQ_PRICE_PER_M_INPUT", "0"))
GROQ_PRICE_PER_M_OUTPUT = float(os.getenv("GROQ_PRICE_PER_M_OUTPUT", "0"))

# Per-user token budget for the current day (input + output across every tool
# and streamed chat). Requests are refused once it is spent; the count resets at
# midnight in the server timezone. Set to 0 to disable the cap entirely.
USER_TOKEN_LIMIT = int(os.getenv("USER_TOKEN_LIMIT", "10000"))

# Firecrawl API — free tier at https://www.firecrawl.dev
FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY", "")

# Optional comma-separated hostname whitelist for URL scraping (empty = allow
# any public host that passes the SSRF gates). Example: "wikipedia.org,edu"
ALLOWED_SCRAPE_DOMAINS = os.getenv("ALLOWED_SCRAPE_DOMAINS", "")

# Gemini is used for embeddings; Groq remains the answer-generation provider.
# Create a free-tier API key at https://aistudio.google.com/app/apikey
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# RAG pipeline settings. Changing model or dimensions requires re-indexing.
RAG_EMBED_MODEL = os.getenv("RAG_EMBED_MODEL", "gemini-embedding-2")
RAG_EMBED_DIMENSIONS = int(os.getenv("RAG_EMBED_DIMENSIONS", "768"))
RAG_CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "800"))
RAG_CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "150"))
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))
RAG_MAX_UPLOAD_MB = int(os.getenv("RAG_MAX_UPLOAD_MB", "20"))
# Ingestion runs in a daemon thread and the uploaded bytes are never persisted,
# so a restart mid-ingest kills the work with nothing to resume from. Documents
# left in pending/processing past this age are reported as failed instead of
# leaving the UI polling forever.
RAG_INGEST_TIMEOUT_SECONDS = int(os.getenv("RAG_INGEST_TIMEOUT_SECONDS", "600"))

# Signup email notifications. Configure these as Render environment variables.
SIGNUP_NOTIFICATION_EMAIL = os.getenv("SIGNUP_NOTIFICATION_EMAIL", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "")
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend"
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() == "true"

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
