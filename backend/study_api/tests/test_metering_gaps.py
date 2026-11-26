"""Every endpoint that reaches the model sits inside the daily token budget.

GenerateView and the chat stream gate on enforce_daily_token_limit() and write
their tokens down. These tests pin the two endpoints that used to skip both
(the chat suggestions and the RAG query), plus the client-facing wording of a
failed RAG request.
"""

from unittest.mock import patch

import pytest

from study_api.langchain_client import _add_usage
from study_api.models import ChatSession, Document, UsageLog

pytestmark = pytest.mark.django_db

SUGGESTIONS = "/api/sessions/{id}/suggestions/"
RAG_QUERY = "/api/rag/query/"


def _session_with_turns(user):
    session = ChatSession.objects.create(user=user)
    session.messages.create(role="user", content="What is photosynthesis?")
    session.messages.create(role="assistant", content="Plants turn light into sugar.")
    return session


def _billed_suggestions(system, user_msg, max_tokens=800):
    # Stand in for the client's per-request counter, which the real call fills.
    _add_usage({"input_tokens": 300, "output_tokens": 40})
    return {"suggestions": ["Why do leaves change colour?"]}


def test_suggestions_are_metered(auth_client):
    session = _session_with_turns(auth_client.user)

    with patch("study_api.dispatchers.query_groq_json", side_effect=_billed_suggestions):
        resp = auth_client.post(SUGGESTIONS.format(id=session.id))

    assert resp.status_code == 200
    log = UsageLog.objects.get(user=auth_client.user)
    assert (log.input_tokens, log.output_tokens) == (300, 40)


def test_suggestions_stop_at_the_daily_budget(auth_client):
    session = _session_with_turns(auth_client.user)
    UsageLog.objects.create(user=auth_client.user, input_tokens=10_000, output_tokens=0)

    with patch("study_api.dispatchers.query_groq_json") as model:
        resp = auth_client.post(SUGGESTIONS.format(id=session.id))

    assert resp.status_code == 429
    model.assert_not_called()
    assert "tokens for today" in resp.json()["error"]


def _ready_document(user):
    return Document.objects.create(
        user=user, title="notes", filename="notes.txt", status="ready"
    )


def test_rag_query_is_metered(auth_client):
    _ready_document(auth_client.user)

    def billed_answer(question, chunks):
        _add_usage({"input_tokens": 500, "output_tokens": 120})
        return {"answer": "a", "grounded": True, "groundedness_reason": ""}

    with (
        patch("study_api.dispatchers.retrieve_chunks", return_value=[]),
        patch("study_api.dispatchers.rag_answer", side_effect=billed_answer),
    ):
        resp = auth_client.post(
            RAG_QUERY, {"question": "What is a chloroplast?"}, format="json"
        )

    assert resp.status_code == 200
    log = UsageLog.objects.get(user=auth_client.user)
    assert (log.input_tokens, log.output_tokens) == (500, 120)


def test_rag_query_stops_at_the_daily_budget(auth_client):
    UsageLog.objects.create(user=auth_client.user, input_tokens=10_000, output_tokens=0)

    with patch("study_api.dispatchers.retrieve_chunks") as retrieve:
        resp = auth_client.post(RAG_QUERY, {"question": "q"}, format="json")

    assert resp.status_code == 429
    retrieve.assert_not_called()


def test_failed_rag_query_does_not_leak_the_exception(auth_client):
    _ready_document(auth_client.user)
    detail = "GEMINI_API_KEY is not set. Add it to your Render environment variables."

    with patch("study_api.dispatchers.retrieve_chunks", side_effect=ValueError(detail)):
        resp = auth_client.post(RAG_QUERY, {"question": "q"}, format="json")

    assert resp.status_code == 503
    assert "GEMINI" not in resp.json()["error"]
    assert "try again" in resp.json()["error"]
