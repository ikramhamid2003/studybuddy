import base64
import json
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User

# Enable DB access for throttling, database cache, and users
pytestmark = pytest.mark.django_db


def test_register_view(api_client):
    resp = api_client.post(
        "/api/auth/register/",
        {
            "username": "newuser",
            "email": "new@example.com",
            "password": "securepassword123",
        },
        format="json",
    )
    assert resp.status_code == 201
    assert resp.data["user"]["username"] == "newuser"


def _claims(access_token):
    """Decode a JWT payload the same way the frontend does to name the user."""

    payload = access_token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload))


def test_login_token_carries_username(api_client):
    User.objects.create_user(username="ada", password="securepassword123")

    resp = api_client.post(
        "/api/auth/login/",
        {"username": "ada", "password": "securepassword123"},
        format="json",
    )
    assert resp.status_code == 200
    assert _claims(resp.data["access"])["username"] == "ada"


def test_refreshed_token_keeps_username(api_client):
    # The frontend renews access tokens in the background, so the claim has to
    # survive rotation or the UI falls back to its generic label mid-session.
    User.objects.create_user(username="ada", password="securepassword123")
    login = api_client.post(
        "/api/auth/login/",
        {"username": "ada", "password": "securepassword123"},
        format="json",
    )

    resp = api_client.post(
        "/api/auth/refresh/", {"refresh": login.data["refresh"]}, format="json"
    )
    assert resp.status_code == 200
    assert _claims(resp.data["access"])["username"] == "ada"


def test_me_endpoint_returns_the_username(auth_client):
    # Older access tokens carry no username claim, so the sidebar recovers it
    # from this endpoint instead of showing a generic label.
    resp = auth_client.get("/api/auth/me/")
    assert resp.status_code == 200
    assert resp.data == {"id": auth_client.user.id, "username": "testuser"}


def test_me_endpoint_rejects_anonymous(api_client):
    assert api_client.get("/api/auth/me/").status_code == 401


@patch("study_api.signup_notifications.send_mail")
def test_signup_notification_contains_safe_account_details(mock_send_mail, settings):
    settings.SIGNUP_NOTIFICATION_EMAIL = "owner@example.com"
    settings.DEFAULT_FROM_EMAIL = "noreply@example.com"
    User.objects.create_user(
        username="notification-user", email="student@example.com", password="secret"
    )

    # The post-save signal sent one notification; inspect it rather than sending
    # a second one by calling the helper directly.
    assert mock_send_mail.call_count == 1
    kwargs = mock_send_mail.call_args.kwargs
    assert kwargs["recipient_list"] == ["owner@example.com"]
    assert "student@example.com" in kwargs["message"]
    assert "secret" not in kwargs["message"]


@patch("study_api.views.stream_chat_groq")
def test_chat_stream_view(mock_stream, auth_client):
    mock_stream.return_value = ["hello", " stream"]

    resp = auth_client.post(
        "/api/chat/stream/", {"message": "hi", "history": []}, format="json"
    )
    assert resp.status_code == 200
    assert resp["Content-Type"] == "text/event-stream"

    chunks = b"".join(resp.streaming_content).decode("utf-8")
    assert "hello" in chunks
    assert "stream" in chunks

