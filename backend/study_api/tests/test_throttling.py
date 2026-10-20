"""Rate limiting for anonymous and authenticated callers.

The unauthenticated ceiling is not enough on its own: every Groq call costs
money, and a logged-in account is exactly what an abusive client would use.
"""

from pathlib import Path

import pytest
from django.conf import settings
from django.core.cache import cache

from study_api.throttles import (
    ActionRateThrottle,
    StudyBuddyAnonRateThrottle,
    StudyBuddyUserRateThrottle,
)

pytestmark = pytest.mark.django_db


def _rates():
    return settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]


def test_both_throttle_classes_are_active():
    classes = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"]

    assert "study_api.throttles.StudyBuddyAnonRateThrottle" in classes
    assert "study_api.throttles.StudyBuddyUserRateThrottle" in classes
    assert "study_api.throttles.ActionRateThrottle" in classes


def test_both_rates_resolve_to_their_documented_defaults():
    assert _rates()["anon"] == "60/hour"
    assert _rates()["user"] == "300/hour"
    assert _rates()["generate"] == "60/hour"
    assert _rates()["rag"] == "40/hour"
    assert _rates()["chat"] == "90/hour"


def test_both_rates_are_read_from_the_environment():
    # Settings are resolved once at import, so a runtime override cannot prove
    # the wiring. Assert the wiring itself: both ceilings must come from getenv,
    # otherwise a deployment could not tighten one without shipping code.
    settings_source = (
        Path(settings.BASE_DIR) / "studybuddy" / "settings.py"
    ).read_text(encoding="utf-8")

    assert 'os.getenv("THROTTLE_ANON_RATE"' in settings_source
    assert 'os.getenv("THROTTLE_USER_RATE"' in settings_source
    assert 'os.getenv("THROTTLE_GENERATE_RATE"' in settings_source
    assert 'os.getenv("THROTTLE_RAG_RATE"' in settings_source
    assert 'os.getenv("THROTTLE_CHAT_RATE"' in settings_source


@pytest.fixture
def tight_user_limit(monkeypatch):
    """Shrink the authenticated ceiling so the limit is reachable in a test."""
    cache.clear()
    monkeypatch.setattr(StudyBuddyUserRateThrottle, "rate", "2/hour", raising=False)
    # ActionRateThrottle reads its ceiling from the same `user` scope for views
    # that opt in, so keep it loose enough that the global ceiling trips first.
    monkeypatch.setattr(ActionRateThrottle, "rate", "100/hour", raising=False)
    yield
    cache.clear()


def test_authenticated_caller_is_throttled(tight_user_limit, auth_client):
    codes = [
        auth_client.get("/api/generations/").status_code for _ in range(3)
    ]

    assert codes[:2] == [200, 200]
    assert codes[2] == 429


def test_anon_and_user_buckets_are_independent(monkeypatch, auth_client, api_client):
    # Exhausting the signed-in ceiling must not lock out anonymous traffic, and
    # vice versa, because they are counted separately.
    cache.clear()
    monkeypatch.setattr(StudyBuddyUserRateThrottle, "rate", "1/hour", raising=False)
    monkeypatch.setattr(ActionRateThrottle, "rate", "100/hour", raising=False)
    monkeypatch.setattr(StudyBuddyAnonRateThrottle, "rate", "50/hour", raising=False)

    auth_client.get("/api/generations/")
    limited = auth_client.get("/api/generations/")
    assert limited.status_code == 429

    # Registration is the AllowAny endpoint, so it is the one place an anonymous
    # caller can get a 2xx and prove its own bucket is untouched.
    anon = api_client.post(
        "/api/auth/register/",
        {"username": "anon_probe", "email": "", "password": "testpassword"},
        format="json",
    )
    assert anon.status_code == 201


@pytest.fixture
def tight_generate_limit(monkeypatch):
    """Make the per-action `generate` scope trip after one request."""
    cache.clear()
    monkeypatch.setattr(StudyBuddyUserRateThrottle, "rate", "1000/hour", raising=False)
    rates = {
        **ActionRateThrottle.THROTTLE_RATES,
        "generate": "1/hour",
        "user": "1000/hour",
        "rag": "1000/hour",
        "chat": "1000/hour",
    }
    monkeypatch.setattr(ActionRateThrottle, "THROTTLE_RATES", rates)
    yield
    cache.clear()


def test_expensive_generate_action_has_stricter_limit(tight_generate_limit, auth_client):
    """generate uses the generate scope, so it trips before the global user ceiling."""
    from unittest.mock import patch

    with patch("study_api.views.query_groq_json") as mock_query:
        mock_query.return_value = {"explanation": "x"}
        first = auth_client.post(
            "/api/generate/",
            {"topic": "x", "type": "explain"},
            format="json",
        )
        second = auth_client.post(
            "/api/generate/",
            {"topic": "y", "type": "explain"},
            format="json",
        )

    assert first.status_code == 200
    assert second.status_code == 429
    # Cheap list calls still succeed under the roomy user ceiling.
    listed = auth_client.get("/api/generations/")
    assert listed.status_code == 200
