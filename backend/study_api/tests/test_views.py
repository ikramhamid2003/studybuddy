from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

# Enable DB access for throttling, database cache, and users
pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client():
    client = APIClient()
    user = User.objects.create_user(username="testuser", password="testpassword")
    client.force_authenticate(user=user)
    return client


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
