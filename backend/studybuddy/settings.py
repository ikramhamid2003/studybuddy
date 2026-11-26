import os
import sys
from datetime import timedelta
from pathlib import Path

import dj_database_url
import sentry_sdk
from corsheaders.defaults import default_headers
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
# Off unless the env says otherwise: with this defaulting to True, one forgotten
# variable on a deployment turned failed requests into tracebacks that dump the
# settings module, and the API can return prompt text. Local dev sets DEBUG=True
# in backend/.env (the README template includes it).
DEBUG = _env_bool("DEBUG", False)
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

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
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
    # Isolated local database so tests never mutate dev/prod data. SQLite can
    # only reach the numpy similarity path, so CI may point TEST_DATABASE_URL at
    # Postgres with pgvector — that is what lets the raw vector SQL run at all.
    test_database_url = os.environ.get("TEST_DATABASE_URL")
    if test_database_url:
        DATABASES = {
            "default": dj_database_url.parse(test_database_url, conn_max_age=0)
        }
    else:
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": BASE_DIR / "db_test.sqlite3",
            }
        }

    # PBKDF2 is deliberately CPU-expensive, and the auth tests create and check
    # users by the dozen; hashing was most of the suite's wall time. MD5 is
    # selected only under IS_TESTING, so deployed settings keep PBKDF2.
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
else:
    # Render/Postgres can provide DATABASE_URL; local dev falls back to sqlite.
    db_url = os.environ.get("DATABASE_URL") or f"sqlite:///{BASE_DIR / 'db.sqlite3'}"
    # Encryption used to be inferred from DEBUG, so a deployment that left DEBUG
    # on — which was its default until now — talked to Postgres in the clear. It
    # gets its own switch: on for any Postgres URL, overridable with
    # DB_SSL_REQUIRE. sqlite is excluded because its driver rejects OPTIONS.
    scheme = db_url.split("://", 1)[0]
    is_postgres = scheme in {"postgres", "postgresql", "pgsql", "postgis"}
    DATABASES = {
        "default": dj_database_url.parse(
            db_url,
            conn_max_age=600,
            ssl_require=_env_bool("DB_SSL_REQUIRE", is_postgres),
        )
    }

# The daily token budget and its 429 message both promise a midnight reset, and
# the reset boundary is timezone.localdate(). Django's unset default here is
# America/Chicago, which silently moved that reset to ~19:00 UTC.
TIME_ZONE = "UTC"
USE_TZ = True


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
CORS_ALLOW_HEADERS = [*default_headers, "x-studybuddy-client"]
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
        "study_api.cookie_auth.CookieJWTAuthentication",
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
        "auth": os.getenv("THROTTLE_AUTH_RATE", "20/hour"),
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


# HTTPS hardening. Off by default so plain-http local setups (docker compose on
# localhost) keep working; render.yaml turns it on. TLS is terminated and
# redirected at the platform edge, so no SECURE_SSL_REDIRECT here.
FORCE_HTTPS = _env_bool("FORCE_HTTPS", False)
if FORCE_HTTPS:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_CONTENT_TYPE_NOSNIFF = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
if IS_TESTING:
    # WhiteNoise warns on every request when its root is missing. Tests never
    # run collectstatic, so create the directory once instead of printing the
    # same warning for every test request.
    STATIC_ROOT.mkdir(parents=True, exist_ok=True)
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

# Per-million-token rates used to turn recorded usage into an estimated cost.
# They default to zero on purpose: Groq prices vary by model and change over
# time, so a hardcoded guess would silently report wrong numbers. Set both to
# the current rate for GROQ_MODEL to get a real cost estimate.
GROQ_PRICE_PER_M_INPUT = float(os.getenv("GROQ_PRICE_PER_M_INPUT", "0"))
GROQ_PRICE_PER_M_OUTPUT = float(os.getenv("GROQ_PRICE_PER_M_OUTPUT", "0"))

# Per-user token budget for the current day (input + output across every tool
# and streamed chat). Requests are refused once it is spent; the count resets at
# midnight UTC (the TIME_ZONE set above). Set to 0 to disable the cap entirely.
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
# Library caps keep one account from running up unbounded embedding calls and
# storage. A value of 0 disables that check.
RAG_MAX_DOCUMENTS_PER_USER = int(os.getenv("RAG_MAX_DOCUMENTS_PER_USER", "25"))
RAG_MAX_CHUNKS_PER_DOCUMENT = int(os.getenv("RAG_MAX_CHUNKS_PER_DOCUMENT", "2000"))
RAG_MAX_CHUNKS_PER_USER = int(os.getenv("RAG_MAX_CHUNKS_PER_USER", "10000"))
# Uploaded bytes are stored until ingestion finishes, so a restart mid-ingest
# requeues the document (up to ingestion.MAX_ATTEMPTS times). Documents left in
# pending/processing past this age are requeued or, when out of attempts,
# reported as failed instead of leaving the UI polling forever.
RAG_INGEST_TIMEOUT_SECONDS = int(os.getenv("RAG_INGEST_TIMEOUT_SECONDS", "600"))
# Drain the ingestion queue from a thread inside the web process. Turn off when
# a separate `manage.py process_ingest_queue` worker runs; tests drive the queue
# explicitly instead.
RAG_START_WORKER_THREAD = _env_bool("RAG_START_WORKER_THREAD", not IS_TESTING)

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
# The notification is sent inside the signup request, so an SMTP host that is
# reachable-but-silent would stall that request on the OS TCP timeout (21s on
# Windows, minutes on Linux — long enough for gunicorn to kill the worker).
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "5"))

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
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
            # Prompts and uploaded notes are private study content.
            send_default_pii=False,
        )
    except Exception as e:  # noqa: BLE001
        print(f"[Warning] Sentry init failed: {e}", file=sys.stderr)
