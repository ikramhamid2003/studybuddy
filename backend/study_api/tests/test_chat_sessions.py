from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from study_api.models import ChatSession

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    """Unauthenticated client for auth-required endpoint checks."""

    return APIClient()


@pytest.fixture
def auth_client():
    """Primary authenticated chat owner."""

    client = APIClient()
    user = User.objects.create_user(username="alice", password="testpassword")
    client.force_authenticate(user=user)
    client.user = user
    return client


@pytest.fixture
def other_auth_client():
    """Different user used to verify session isolation."""

    client = APIClient()
    user = User.objects.create_user(username="bob", password="testpassword")
    client.force_authenticate(user=user)
    client.user = user
    return client


def test_create_session(auth_client):
    resp = auth_client.post("/api/sessions/", {}, format="json")
    assert resp.status_code == 201
    assert resp.data["title"] == "New Chat"
    assert ChatSession.objects.filter(user=auth_client.user).count() == 1


def test_list_sessions_scoped_to_user(auth_client, other_auth_client):
    ChatSession.objects.create(user=auth_client.user, title="Mine")
    ChatSession.objects.create(user=other_auth_client.user, title="Not mine")

    resp = auth_client.get("/api/sessions/")
    assert resp.status_code == 200
    titles = [s["title"] for s in resp.data]
    assert titles == ["Mine"]


def test_cannot_access_other_users_session(auth_client, other_auth_client):
    session = ChatSession.objects.create(user=other_auth_client.user, title="Bob's chat")
    resp = auth_client.get(f"/api/sessions/{session.id}/")
    assert resp.status_code == 404


def test_rename_session(auth_client):
    session = ChatSession.objects.create(user=auth_client.user, title="Old title")
    resp = auth_client.patch(
        f"/api/sessions/{session.id}/", {"title": "New title"}, format="json"
    )
    assert resp.status_code == 200
    session.refresh_from_db()
    assert session.title == "New title"


def test_delete_session(auth_client):
    session = ChatSession.objects.create(user=auth_client.user, title="Bye")
    resp = auth_client.delete(f"/api/sessions/{session.id}/")
    assert resp.status_code == 204
    assert not ChatSession.objects.filter(id=session.id).exists()


@patch("study_api.views.stream_chat_groq")
def test_chat_stream_with_session_persists_full_reply(mock_stream, auth_client):
    # Streaming chunks are joined before saving the assistant's final message.
    mock_stream.return_value = ["hello", " world"]
    session = ChatSession.objects.create(user=auth_client.user)

    resp = auth_client.post(
        "/api/chat/stream/",
        {"message": "hi there", "session_id": session.id},
        format="json",
    )
    assert resp.status_code == 200
    chunks = b"".join(resp.streaming_content).decode("utf-8")
    assert "hello" in chunks and "world" in chunks

    session.refresh_from_db()
    messages = list(session.messages.all())
    assert len(messages) == 2
    assert messages[1].content == "hello world"
    assert session.title == "hi there"
