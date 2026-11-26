"""Deployment guards: the serving key, the proxy count, the admin mount point."""

import importlib

import pytest
from django.conf import settings
from django.test import override_settings
from rest_framework.test import APIRequestFactory
from studybuddy.settings import secret_key_is_public

PRIVATE_KEY = "k" * 64


def test_published_and_short_keys_are_not_secrets():
    # The settings default, and the value shipped in backend/.env.example.
    assert secret_key_is_public("django-insecure-change-this-before-production-please")
    assert secret_key_is_public("some-long-random-secret-key")
    assert secret_key_is_public("short")
    assert secret_key_is_public("   ")
    assert not secret_key_is_public(PRIVATE_KEY)


def test_wsgi_refuses_to_serve_a_published_key():
    with override_settings(DEBUG=False, SECRET_KEY=PRIVATE_KEY):
        from studybuddy import wsgi

    with (
        override_settings(DEBUG=False, SECRET_KEY="some-long-random-secret-key"),
        pytest.raises(RuntimeError, match="SECRET_KEY"),
    ):
        importlib.reload(wsgi)

    # Leave the module in its importable state for anything that follows.
    with override_settings(DEBUG=False, SECRET_KEY=PRIVATE_KEY):
        importlib.reload(wsgi)


def test_wsgi_serves_with_a_private_key():
    with override_settings(DEBUG=False, SECRET_KEY=PRIVATE_KEY):
        from studybuddy import wsgi

    assert callable(wsgi.application)


def test_one_trusted_proxy_keeps_the_client_out_of_its_own_throttle_bucket():
    """With one proxy the ident is the address that proxy appended, not the
    client-chosen part of X-Forwarded-For, so spoofing it changes nothing."""
    from study_api.throttles import AuthRateThrottle

    assert settings.REST_FRAMEWORK["NUM_PROXIES"] == 1
    request = APIRequestFactory().post("/api/auth/login/")
    request.META["REMOTE_ADDR"] = "10.0.0.5"  # the proxy itself
    request.META["HTTP_X_FORWARDED_FOR"] = "spoof-a, 203.0.113.9"
    first = AuthRateThrottle().get_ident(request)
    request.META["HTTP_X_FORWARDED_FOR"] = "spoof-b, 203.0.113.9"
    second = AuthRateThrottle().get_ident(request)

    assert first == second == "203.0.113.9"


def test_admin_is_mounted_at_the_configured_path():
    from studybuddy import urls as project_urls

    assert settings.ADMIN_PATH in [str(p.pattern) for p in project_urls.urlpatterns]
