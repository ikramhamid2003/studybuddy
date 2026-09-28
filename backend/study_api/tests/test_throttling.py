"""Rate limiting for anonymous and authenticated callers.

The unauthenticated ceiling is not enough on its own: every Groq call costs
money, and a logged-in account is exactly what an abusive client would use.
"""

from pathlib import Path

import pytest
from django.conf import settings
from django.core.cache import cache
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

pytestmark = pytest.mark.django_db


def _rates():
    return settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]


def test_both_throttle_classes_are_active():
    classes = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"]

    assert "rest_framework.throttling.AnonRateThrottle" in classes
    assert "rest_framework.throttling.UserRateThrottle" in classes


def test_both_rates_resolve_to_their_documented_defaults():
    assert _rates()["anon"] == "60/hour"
    assert _rates()["user"] == "300/hour"


def test_both_rates_are_read_from_the_environment():
    # Settings are resolved once at import, so a runtime override cannot prove
    # the wiring. Assert the wiring itself: both ceilings must come from getenv,
    # otherwise a deployment could not tighten one without shipping code.
    settings_source = (
        Path(settings.BASE_DIR) / "studybuddy" / "settings.py"
    ).read_text(encoding="utf-8")

    assert 'os.getenv("THROTTLE_ANON_RATE"' in settings_source
    assert 'os.getenv("THROTTLE_USER_RATE"' in settings_source


@pytest.fixture
def tight_user_limit(monkeypatch):
    """Shrink the authenticated ceiling so the limit is reachable in a test."""
    cache.clear()
    monkeypatch.setattr(UserRateThrottle, "rate", "2/hour", raising=False)
    yield
    cache.clear()


def test_authenticated_caller_is_throttled(tight_user_limit, auth_client):
    codes = [
        auth_client.post(
            "/api/unified/", {"action": "generations_list"}, format="json"
        ).status_code
        for _ in range(3)
    ]

    assert codes[:2] == [200, 200]
    assert codes[2] == 429


def test_anon_and_user_buckets_are_independent(monkeypatch, auth_client, api_client):
    # Exhausting the signed-in ceiling must not lock out anonymous traffic, and
    # vice versa, because they are counted separately.
    cache.clear()
    monkeypatch.setattr(UserRateThrottle, "rate", "1/hour", raising=False)
    monkeypatch.setattr(AnonRateThrottle, "rate", "50/hour", raising=False)

    auth_client.post("/api/unified/", {"action": "generations_list"}, format="json")
    limited = auth_client.post(
        "/api/unified/", {"action": "generations_list"}, format="json"
    )
    assert limited.status_code == 429

    anon = api_client.post("/api/unified/", {"action": "health"}, format="json")
    assert anon.status_code == 200
