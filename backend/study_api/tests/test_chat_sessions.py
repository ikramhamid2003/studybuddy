from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from study_api.models import ChatMessage, ChatSession

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client():
    client = APIClient()
    user = User.objects.create_user(username="alice", password="testpassword")
    client.force_authenticate(user=user)
    client.user = user
    return client


@pytest.fixture
def other_auth_client():
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


@patch("study_api.views.chat_groq")
def test_chat_with_session_persists_messages_and_titles(mock_chat, auth_client):
    mock_chat.return_value = "Photosynthesis is how plants make food from light."
    session = ChatSession.objects.create(user=auth_client.user)  # default title "New Chat"

    resp = auth_client.post(
        "/api/chat/",
        {"message": "Explain photosynthesis", "session_id": session.id},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["reply"] == "Photosynthesis is how plants make food from light."
    assert resp.data["session_id"] == session.id

    session.refresh_from_db()
    assert session.title == "Explain photosynthesis"  # auto-titled from first message
    messages = list(session.messages.all())
    assert len(messages) == 2
    assert messages[0].role == "user"
    assert messages[0].content == "Explain photosynthesis"
    assert messages[1].role == "assistant"


@patch("study_api.views.chat_groq")
def test_chat_with_session_uses_stored_history_not_client_history(mock_chat, auth_client):
    session = ChatSession.objects.create(user=auth_client.user, title="Existing chat")
    ChatMessage.objects.create(session=session, role="user", content="hi")
    ChatMessage.objects.create(session=session, role="assistant", content="hello!")
    mock_chat.return_value = "sure thing"

    auth_client.post(
        "/api/chat/",
        {
            "message": "second question",
            "session_id": session.id,
            "history": [],  # deliberately empty/wrong — server must ignore this
        },
        format="json",
    )

    called_history = mock_chat.call_args[0][1]  # chat_groq(system, history, message, ...)
    assert called_history == [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello!"}]

    # title stays as-is since this wasn't the first turn
    session.refresh_from_db()
    assert session.title == "Existing chat"
    assert session.messages.count() == 4


def test_chat_without_session_id_still_works_stateless(auth_client):
    with patch("study_api.views.chat_groq") as mock_chat:
        mock_chat.return_value = "stateless reply"
        resp = auth_client.post(
            "/api/chat/", {"message": "hi", "history": []}, format="json"
        )
        assert resp.status_code == 200
        assert resp.data["reply"] == "stateless reply"
        assert resp.data["session_id"] is None
        assert ChatSession.objects.count() == 0


@patch("study_api.views.stream_chat_groq")
def test_chat_stream_with_session_persists_full_reply(mock_stream, auth_client):
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
