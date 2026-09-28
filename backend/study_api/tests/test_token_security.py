"""Refresh-token rotation and revocation.

Covers the security guarantees an expiring session depends on: tokens rotate,
rotated and logged-out tokens are blacklisted, and revocation itself is
reachable even when the access token has already expired.
"""

import pytest
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

pytestmark = pytest.mark.django_db

CREDS = {"username": "rotuser", "password": "securepassword123"}


def _login(api_client):
    User.objects.create_user(**CREDS)
    resp = api_client.post(
        "/api/unified/",
        {"action": "login", **CREDS},
        format="json",
    )
    assert resp.data["ok"] is True
    return resp.data["data"]


def _refresh(api_client, refresh):
    return api_client.post(
        "/api/unified/", {"action": "refresh", "refresh": refresh}, format="json"
    )


def test_jwt_rotation_and_blacklisting_are_enabled():
    # Guards the settings that make revocation meaningful at all.
    assert settings.SIMPLE_JWT["ROTATE_REFRESH_TOKENS"] is True
    assert settings.SIMPLE_JWT["BLACKLIST_AFTER_ROTATION"] is True
    assert "rest_framework_simplejwt.token_blacklist" in settings.INSTALLED_APPS


def test_refresh_token_works_before_logout(api_client):
    tokens = _login(api_client)

    resp = _refresh(api_client, tokens["refresh"])

    assert resp.status_code == 200
    assert resp.data["ok"] is True
    assert resp.data["data"]["access"]


def test_rotation_issues_a_new_refresh_and_blacklists_the_old_one(api_client):
    tokens = _login(api_client)

    first = _refresh(api_client, tokens["refresh"])
    assert first.data["ok"] is True
    assert first.data["data"]["refresh"] != tokens["refresh"]

    # Re-using the rotated-away token must fail.
    replay = _refresh(api_client, tokens["refresh"])
    assert replay.data["ok"] is False


def test_logout_blacklists_the_refresh_token(api_client):
    tokens = _login(api_client)

    out = api_client.post(
        "/api/unified/",
        {"action": "logout", "refresh": tokens["refresh"]},
        format="json",
    )

    assert out.status_code == 200
    assert out.data["ok"] is True
    assert out.data["data"]["blacklisted"] is True

    after = _refresh(api_client, tokens["refresh"])
    assert after.data["ok"] is False


def test_logout_works_without_an_access_token(api_client):
    # The whole point: a user whose access token already expired can still
    # revoke their refresh token. api_client sends no Authorization header.
    tokens = _login(api_client)

    out = api_client.post(
        "/api/unified/",
        {"action": "logout", "refresh": tokens["refresh"]},
        format="json",
    )

    assert out.status_code == 200
    assert out.data["ok"] is True


def test_logout_is_idempotent_for_an_invalid_token(api_client):
    out = api_client.post(
        "/api/unified/", {"action": "logout", "refresh": "not-a-token"}, format="json"
    )

    assert out.status_code == 200
    assert out.data["data"]["blacklisted"] is False


def test_logout_requires_a_refresh_token(api_client):
    out = api_client.post("/api/unified/", {"action": "logout"}, format="json")

    assert out.status_code == 400
    assert out.data["ok"] is False


def test_unregister_blacklists_the_refresh_token(auth_client):
    token = RefreshToken.for_user(auth_client.user)
    jti = token["jti"]

    resp = auth_client.post(
        "/api/unified/",
        {"action": "unregister", "refresh": str(token)},
        format="json",
    )

    assert resp.data["ok"] is True
    assert not User.objects.filter(pk=auth_client.user.pk).exists()
    # The token must not outlive the account it belonged to.
    assert BlacklistedToken.objects.filter(token__jti=jti).exists()
