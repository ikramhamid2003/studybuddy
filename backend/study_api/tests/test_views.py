from unittest.mock import patch

import pytest
from study_api.models import ChatMessage, ChatSession

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


def test_unified_login_returns_tokens_under_data(api_client):
    User.objects.create_user(username="newuser", password="securepassword123")

    resp = api_client.post(
        "/api/unified/",
        {"action": "login", "username": "newuser", "password": "securepassword123"},
        format="json",
    )

    assert resp.status_code == 200
    assert resp.data["ok"] is True
    assert resp.data["data"]["access"]
    assert resp.data["data"]["refresh"]


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


@patch("study_api.dispatchers.stream_chat_groq")
def test_unified_chat_stream_uses_session_history(mock_stream, auth_client):
    # Existing session messages should be sent back to the model as chat history.
    mock_stream.return_value = ["remembered"]
    session = ChatSession.objects.create(user=auth_client.user)
    ChatMessage.objects.create(session=session, role="user", content="what is inertia?")
    ChatMessage.objects.create(
        session=session,
        role="assistant",
        content="Inertia resists motion changes.",
    )

    resp = auth_client.post(
        "/api/unified/",
        {"action": "chat_stream", "message": "say that again", "session_id": session.id},
        format="json",
    )

    assert resp.status_code == 200
    chunks = b"".join(resp.streaming_content).decode("utf-8")
    assert "remembered" in chunks
    assert mock_stream.call_args[0][1] == [
        {"role": "user", "content": "what is inertia?"},
        {"role": "assistant", "content": "Inertia resists motion changes."},
    ]


@patch("study_api.dispatchers.stream_chat_groq")
def test_unified_chat_stream_includes_other_session_context(mock_stream, auth_client):
    # A new session can still receive compact memory from older sessions.
    mock_stream.return_value = ["remembered"]
    old_session = ChatSession.objects.create(user=auth_client.user, title="Physics")
    ChatMessage.objects.create(
        session=old_session,
        role="user",
        content="I am studying inertia.",
    )
    ChatMessage.objects.create(
        session=old_session,
        role="assistant",
        content="Inertia is resistance to motion changes.",
    )
    new_session = ChatSession.objects.create(user=auth_client.user)

    resp = auth_client.post(
        "/api/unified/",
        {
            "action": "chat_stream",
            "message": "what was I studying?",
            "session_id": new_session.id,
        },
        format="json",
    )

    assert resp.status_code == 200
    b"".join(resp.streaming_content)
    history = mock_stream.call_args[0][1]
    assert "previous chat sessions" in history[0]["content"]
    assert "I am studying inertia." in history[0]["content"]
