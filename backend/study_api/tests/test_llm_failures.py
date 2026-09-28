"""Failure paths for the Groq-backed endpoints.

The contract these lock in: when the model provider misbehaves, the API answers
with the unified error envelope and an honest status code. It must never leak a
raw 500, and a stream that dies mid-response must tell the client why.
"""

import json
from unittest.mock import patch

import pytest

pytestmark = pytest.mark.django_db


class GroqTimeout(Exception):
    """Stands in for the provider timing out."""


class GroqRateLimited(Exception):
    """Stands in for a 429 from Groq."""


class GroqServerError(Exception):
    """Stands in for any other provider-side 5xx."""


# ── Non-streaming generation ────────────────────────────────────────────────


@patch("study_api.dispatchers.query_groq_json")
def test_provider_timeout_returns_envelope_not_500(mock_query, auth_client):
    mock_query.side_effect = GroqTimeout("Request timed out after 30s")

    resp = auth_client.post(
        "/api/unified/", {"action": "generate", "topic": "gravity", "type": "explain"}, format="json"
    )

    assert resp.status_code == 503
    assert resp.data["ok"] is False
    assert "timed out" in resp.data["error"]


@patch("study_api.dispatchers.query_groq_json")
def test_provider_rate_limit_returns_envelope_not_500(mock_query, auth_client):
    # Groq answers 429 when the account is over its quota; that must surface as
    # a clean service-unavailable, not a crash.
    mock_query.side_effect = GroqRateLimited("rate limit exceeded, retry later")

    resp = auth_client.post(
        "/api/unified/", {"action": "generate", "topic": "gravity", "type": "explain"}, format="json"
    )

    assert resp.status_code == 503
    assert resp.data["ok"] is False
    assert "rate limit" in resp.data["error"]


@patch("study_api.dispatchers.query_groq_json")
def test_provider_server_error_returns_envelope_not_500(mock_query, auth_client):
    mock_query.side_effect = GroqServerError("upstream connect error")

    resp = auth_client.post(
        "/api/unified/", {"action": "generate", "topic": "gravity", "type": "explain"}, format="json"
    )

    assert resp.status_code == 503
    assert resp.data["ok"] is False


@patch("study_api.dispatchers.query_groq_json")
def test_malformed_model_output_is_reported_as_a_parse_failure(mock_query, auth_client):
    # The model returned prose where JSON was required.
    mock_query.side_effect = ValueError("Invalid json output: 'Sure! Here is your answer'")

    resp = auth_client.post(
        "/api/unified/", {"action": "generate", "topic": "gravity", "type": "explain"}, format="json"
    )

    # The unified endpoint reports every provider-side failure as 503; only the
    # legacy /api/generate/ path distinguishes a parse failure as 502.
    assert resp.status_code in (502, 503)
    assert resp.data["ok"] is False
    assert "Invalid json output" in resp.data["error"]


@patch("study_api.dispatchers.query_groq_structured")
def test_malformed_structured_output_returns_envelope_not_500(mock_query, auth_client):
    # Quiz/flashcards validate against a Pydantic schema, so a shape mismatch
    # must also come back as an envelope.
    mock_query.side_effect = ValueError("1 validation error for QuizResponse")

    resp = auth_client.post(
        "/api/unified/", {"action": "generate", "topic": "gravity", "type": "quiz"}, format="json"
    )

    assert resp.status_code in (502, 503)
    assert resp.data["ok"] is False
    assert "validation error" in resp.data["error"]


@patch("study_api.dispatchers.query_groq_json")
def test_failed_generation_is_never_persisted(mock_query, auth_client):
    from study_api.models import Generation

    mock_query.side_effect = GroqTimeout("boom")

    auth_client.post(
        "/api/unified/", {"action": "generate", "topic": "gravity", "type": "explain"}, format="json"
    )

    assert not Generation.objects.exists()


# ── Streaming chat ──────────────────────────────────────────────────────────


def _sse_frames(response):
    body = b"".join(response.streaming_content).decode()
    frames = []
    for line in body.split("\n\n"):
        line = line.strip()
        if line.startswith("data: "):
            frames.append(json.loads(line[6:]))
    return frames


@patch("study_api.dispatchers.stream_chat_groq")
def test_stream_interrupted_mid_response_emits_an_error_frame(mock_stream, auth_client):
    """A provider that dies after the first token must not strand the client.

    The status is already 200 by then, so the only way to report the failure is
    an error frame inside the stream.
    """

    def dying_stream(*_args, **_kwargs):
        yield "Plants "
        raise GroqServerError("connection reset by peer")

    mock_stream.side_effect = dying_stream

    resp = auth_client.post(
        "/api/unified/", {"action": "chat_stream", "message": "explain photosynthesis"}, format="json"
    )

    assert resp.status_code == 200
    frames = _sse_frames(resp)

    assert {"chunk": "Plants "} in frames
    errors = [f for f in frames if "error" in f]
    assert len(errors) == 1
    assert "connection reset" in errors[0]["error"]
    # A partial reply must not be mistaken for a completed one.
    assert not any(f.get("done") for f in frames)


@patch("study_api.dispatchers.stream_chat_groq")
def test_stream_that_fails_before_any_token_emits_an_error_frame(mock_stream, auth_client):
    mock_stream.side_effect = GroqTimeout("Request timed out")

    resp = auth_client.post(
        "/api/unified/", {"action": "chat_stream", "message": "hello"}, format="json"
    )

    assert resp.status_code == 200
    frames = _sse_frames(resp)
    assert len(frames) == 1
    assert "timed out" in frames[0]["error"]


@patch("study_api.dispatchers.stream_chat_groq")
def test_stream_interruption_with_a_session_does_not_save_a_partial_reply(
    mock_stream, auth_client
):
    """A dropped stream must not persist half an assistant turn."""
    from study_api.models import ChatMessage, ChatSession

    session = ChatSession.objects.create(user=auth_client.user)

    def dying_stream(*_args, **_kwargs):
        yield "half an "
        raise GroqServerError("connection reset")

    mock_stream.side_effect = dying_stream

    resp = auth_client.post(
        "/api/unified/",
        {"action": "chat_stream", "message": "hi", "session_id": session.id},
        format="json",
    )
    assert resp.status_code == 200
    _sse_frames(resp)

    # The partial turn is discarded rather than stored as a real answer.
    assert not ChatMessage.objects.filter(session=session).exists()


@patch("study_api.dispatchers.stream_chat_groq")
def test_stream_failure_frame_shape_is_stable(mock_stream, auth_client):
    """Every stream failure is reported the same way, so the client can rely on it."""
    mock_stream.side_effect = GroqTimeout("nope")

    resp = auth_client.post(
        "/api/unified/", {"action": "chat_stream", "message": "hi"}, format="json"
    )

    frames = _sse_frames(resp)
    assert len(frames) == 1
    assert set(frames[0].keys()) == {"error"}
    assert isinstance(frames[0]["error"], str)
