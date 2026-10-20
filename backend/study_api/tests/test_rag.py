"""Tests for RAG pipeline, models, and endpoints."""
from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from study_api.dispatchers import (
    _action_rag_delete,
    _action_rag_document_status,
    _action_rag_list,
    _action_rag_query,
    _action_rag_upload,
)
from study_api.models import Document, DocumentChunk, Generation
from study_api.rag_pipeline import (
    _embed_contents,
    chunk_text,
    extract_text,
    rag_answer,
    retrieve_chunks,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    return User.objects.create_user(username="teststudent", password="password123")


@pytest.fixture
def other_user():
    return User.objects.create_user(username="otherstudent", password="password123")


@pytest.fixture
def ready_doc(user):
    doc = Document.objects.create(
        user=user,
        title="Physics Notes",
        filename="physics.txt",
        file_size=120,
        page_count=1,
        chunk_count=2,
        status="ready",
    )
    # 3-dim mock vectors for fast testing
    DocumentChunk.objects.create(
        document=doc,
        chunk_index=0,
        text="Newton's first law states that an object remains at rest unless acted on by a net force.",
        page_number=1,
        embedding=[1.0, 0.0, 0.0],
    )
    DocumentChunk.objects.create(
        document=doc,
        chunk_index=1,
        text="Newton's second law is F = ma.",
        page_number=1,
        embedding=[0.0, 1.0, 0.0],
    )
    return doc


# ── Text Extraction & Chunking Unit Tests ────────────────────────────────────


def test_extract_text_txt():
    content = b"Hello, world! This is a test file."
    text, pages = extract_text("notes.txt", content)
    assert text == "Hello, world! This is a test file."
    assert pages == 1


def test_extract_text_empty_raises_error():
    with pytest.raises(ValueError, match="uploaded file is empty"):
        extract_text("empty.txt", b"")


def test_extract_text_unsupported_extension():
    with pytest.raises(ValueError, match="Unsupported file type"):
        extract_text("script.exe", b"binary content")


def test_chunk_text_basic():
    sample = "Chapter 1: Mechanics. " * 30
    chunks = chunk_text(sample, page_count=2)
    assert len(chunks) > 0
    assert chunks[0]["chunk_index"] == 0
    assert 1 <= chunks[0]["page_number"] <= 2
    assert chunks[0]["text"]


def test_chunk_text_empty_or_whitespace():
    chunks = chunk_text("   \n\n   ", page_count=1)
    assert chunks == []


# ── Retrieval & Cosine Similarity Tests ──────────────────────────────────────


@patch("study_api.rag_pipeline.embed_query")
def test_retrieve_chunks_numpy_fallback(mock_embed, ready_doc):
    # Query vector closest to chunk 0 [1.0, 0.0, 0.0]
    mock_embed.return_value = [0.99, 0.05, 0.0]

    chunks = retrieve_chunks([ready_doc.id], "inertia and rest", top_k=2)
    assert len(chunks) == 2
    assert chunks[0]["chunk_index"] == 0
    assert "Newton's first law" in chunks[0]["text"]
    assert chunks[0]["score"] > chunks[1]["score"]


def test_retrieve_chunks_empty_args():
    assert retrieve_chunks([], "query") == []
    assert retrieve_chunks([1], "   ") == []


@patch("study_api.rag_pipeline.requests.post")
def test_gemini_embeddings_use_retrieval_formats(mock_post, settings):
    settings.GEMINI_API_KEY = "test-key"
    settings.RAG_EMBED_MODEL = "gemini-embedding-2"
    settings.RAG_EMBED_DIMENSIONS = 128
    mock_post.return_value.json.return_value = {
        "embeddings": [{"values": [0.1] * 128}, {"values": [0.2] * 128}]
    }

    vectors = _embed_contents([
        "title: none | text: Newton's first law.",
        "task: question answering | query: What is inertia?",
    ])

    assert vectors == [[0.1] * 128, [0.2] * 128]
    url = mock_post.call_args.args[0]
    request_body = mock_post.call_args.kwargs["json"]
    assert url.endswith("/models/gemini-embedding-2:batchEmbedContents")
    assert request_body["requests"][0]["output_dimensionality"] == 128
    assert request_body["requests"][1]["content"]["parts"][0]["text"].startswith(
        "task: question answering"
    )


@patch("study_api.rag_pipeline.check_groundedness")
@patch("study_api.langchain_client.query_groq")
def test_rag_answer_with_chunks(mock_query_groq, mock_grounded):
    mock_query_groq.return_value = "According to your notes, an object stays at rest."
    mock_grounded.return_value = {"grounded": True, "reason": "Supported."}
    chunks = [
        {
            "document_id": 1,
            "document_title": "Physics Notes",
            "page_number": 1,
            "text": "Newton's first law explains inertia.",
        }
    ]
    result = rag_answer("What is inertia?", chunks)
    assert "object stays at rest" in result["answer"]
    assert result["grounded"] is True
    assert mock_query_groq.called


def test_rag_answer_no_chunks():
    result = rag_answer("What is inertia?", [])
    assert "could not find relevant content" in result["answer"].lower()
    assert result["grounded"] is False


@patch("study_api.langchain_client.query_groq_json")
@patch("study_api.langchain_client.query_groq")
def test_rag_answer_ungrounded_adds_caution(mock_query_groq, mock_json):
    mock_query_groq.return_value = "The moon is made of cheese."
    mock_json.return_value = {"grounded": False, "reason": "Not in the excerpts."}
    chunks = [
        {
            "document_id": 1,
            "document_title": "Physics Notes",
            "page_number": 1,
            "text": "Newton's first law explains inertia.",
        }
    ]
    result = rag_answer("What is inertia?", chunks)
    assert result["grounded"] is False
    assert "Caution" in result["answer"]
    assert "Not in the excerpts" in result["answer"]


# ── Dispatcher Actions Edge Cases & Isolation ────────────────────────────────


def test_rag_upload_missing_file(user):
    request = MagicMock()
    request.user = user
    request.FILES = {}

    resp = _action_rag_upload({}, request)
    assert resp.status_code == 400
    assert "No file uploaded" in resp.data["error"]  # pyrefly: ignore[unsupported-operation]


def test_rag_upload_empty_file(user):
    file = SimpleUploadedFile("empty.txt", b"", content_type="text/plain")
    request = MagicMock()
    request.user = user
    request.FILES = {"file": file}

    resp = _action_rag_upload({}, request)
    assert resp.status_code == 400
    assert "file is empty" in resp.data["error"]  # pyrefly: ignore[unsupported-operation]


def test_rag_upload_unsupported_ext(user):
    file = SimpleUploadedFile("danger.exe", b"alert('x')", content_type="application/octet-stream")
    request = MagicMock()
    request.user = user
    request.FILES = {"file": file}

    resp = _action_rag_upload({}, request)
    assert resp.status_code == 400
    assert "Unsupported file type" in resp.data["error"]  # pyrefly: ignore[unsupported-operation]


@patch("study_api.dispatchers.ingest_document")
def test_rag_upload_success(mock_ingest, user):
    file = SimpleUploadedFile("bio.txt", b"Mitochondria is the powerhouse of the cell.", content_type="text/plain")
    request = MagicMock()
    request.user = user
    request.FILES = {"file": file}

    resp = _action_rag_upload({"title": "Cell Biology"}, request)
    assert resp.status_code == 201
    assert resp.data["ok"] is True  # pyrefly: ignore[unsupported-operation]
    data = resp.data["data"]  # pyrefly: ignore[unsupported-operation]
    assert data["title"] == "Cell Biology"
    assert data["status"] == "pending"
    assert Document.objects.filter(id=data["id"], user=user).exists()


def test_rag_list_user_isolation(user, other_user, ready_doc):
    # Other user creates their own doc
    other_doc = Document.objects.create(
        user=other_user,
        title="Other's Secret Doc",
        filename="secret.txt",
        status="ready",
    )

    request = MagicMock()
    request.user = user
    resp = _action_rag_list({}, request)
    assert resp.data["ok"] is True  # pyrefly: ignore[unsupported-operation]
    doc_ids = [d["id"] for d in resp.data["data"]]  # pyrefly: ignore[unsupported-operation]
    assert ready_doc.id in doc_ids
    assert other_doc.id not in doc_ids


def test_rag_document_status_invalid_or_not_found(user, other_user, ready_doc):
    request = MagicMock()
    request.user = user

    # Invalid ID
    bad_resp = _action_rag_document_status({"document_id": "not-an-int"}, request)
    assert bad_resp.status_code == 400

    # Non-existent ID
    missing_resp = _action_rag_document_status({"document_id": 99999}, request)
    assert missing_resp.status_code == 404

    # Other user's document cannot be accessed
    request.user = other_user
    forbidden_resp = _action_rag_document_status({"document_id": ready_doc.id}, request)
    assert forbidden_resp.status_code == 404


def test_rag_delete_isolation_and_cascade(user, other_user, ready_doc):
    request = MagicMock()
    request.user = other_user

    # Other user cannot delete
    fail_resp = _action_rag_delete({"document_id": ready_doc.id}, request)
    assert fail_resp.status_code == 404
    assert Document.objects.filter(id=ready_doc.id).exists()

    # Owner can delete, cascades chunks
    request.user = user
    chunk_count_before = DocumentChunk.objects.filter(document=ready_doc).count()
    assert chunk_count_before == 2

    ok_resp = _action_rag_delete({"document_id": ready_doc.id}, request)
    assert ok_resp.data["ok"] is True  # pyrefly: ignore[unsupported-operation]
    assert not Document.objects.filter(id=ready_doc.id).exists()
    assert DocumentChunk.objects.filter(document_id=ready_doc.id).count() == 0


@patch("study_api.dispatchers.retrieve_chunks")
@patch("study_api.dispatchers.rag_answer")
def test_rag_query_success(mock_answer, mock_retrieve, user, ready_doc):
    mock_retrieve.return_value = [
        {
            "id": 1,
            "document_id": ready_doc.id,
            "document_title": ready_doc.title,
            "page_number": 1,
            "score": 0.95,
            "text": "Newton's first law explains inertia.",
        }
    ]
    mock_answer.return_value = {
        "answer": "Inertia is the tendency of an object to resist changes in motion.",
        "grounded": True,
        "groundedness_reason": "Supported by the excerpts.",
    }

    request = MagicMock()
    request.user = user
    resp = _action_rag_query(
        {"question": "What is Newton's first law?", "document_ids": [ready_doc.id]},
        request,
    )
    assert resp.data["ok"] is True  # pyrefly: ignore[unsupported-operation]
    data = resp.data["data"]  # pyrefly: ignore[unsupported-operation]
    assert "Inertia" in data["answer"]
    assert data["grounded"] is True
    assert len(data["sources"]) == 1
    assert data["sources"][0]["document_title"] == "Physics Notes"


def test_rag_query_edge_cases(user, ready_doc):
    request = MagicMock()
    request.user = user

    # Empty question
    resp_empty = _action_rag_query({"question": "   "}, request)
    assert resp_empty.status_code == 400
    assert "question is required" in resp_empty.data["error"]  # pyrefly: ignore[unsupported-operation]

    # Invalid document_ids format
    resp_bad_type = _action_rag_query(
        {"question": "Valid?", "document_ids": "not-a-list"},
        request,
    )
    assert resp_bad_type.status_code == 400

    # Non-existent document selection
    resp_none_ready = _action_rag_query(
        {"question": "Valid?", "document_ids": [99999]},
        request,
    )
    assert resp_none_ready.status_code == 400


# ── Stale-ingest recovery ────────────────────────────────────────────────────
# Ingestion runs in a daemon thread and the uploaded bytes are never persisted,
# so a deploy or restart mid-ingest destroys the work. Without a reap the row
# sits in 'processing' forever and the frontend — which polls while any document
# is pending or processing — never stops.


def _stale_doc(user, doc_status="processing", age_seconds=3600):
    """Create a document whose updated_at is backdated past the ingest timeout."""

    doc = Document.objects.create(
        user=user, title="Stuck Notes", filename="stuck.pdf", status=doc_status
    )
    # auto_now resets updated_at on save(), so backdate it through the queryset.
    Document.objects.filter(id=doc.id).update(
        updated_at=timezone.now() - timedelta(seconds=age_seconds)
    )
    doc.refresh_from_db()
    return doc


def _request_for(user):
    request = MagicMock()
    request.user = user
    return request


def test_stale_processing_document_is_reaped(user):
    doc = _stale_doc(user)

    resp = _action_rag_document_status(
        {"document_id": doc.id}, _request_for(user)
    )

    assert resp.status_code == 200
    data = resp.data["data"]  # pyrefly: ignore[unsupported-operation]
    assert data["status"] == "error"
    # The message must tell the student what to do, not just that it failed.
    assert "restart" in data["error_message"]
    assert "upload the file again" in data["error_message"]


def test_stale_pending_document_is_reaped(user):
    doc = _stale_doc(user, doc_status="pending")

    _action_rag_document_status({"document_id": doc.id}, _request_for(user))

    doc.refresh_from_db()
    assert doc.status == "error"


def test_recently_started_ingest_is_left_alone(user):
    # A document still inside the timeout is presumably genuinely working.
    doc = _stale_doc(user, age_seconds=30)

    _action_rag_document_status({"document_id": doc.id}, _request_for(user))

    doc.refresh_from_db()
    assert doc.status == "processing"
    assert doc.error_message == ""


def test_ready_document_is_never_reaped(user, ready_doc):
    Document.objects.filter(id=ready_doc.id).update(
        updated_at=timezone.now() - timedelta(hours=5)
    )

    _action_rag_list({}, _request_for(user))

    ready_doc.refresh_from_db()
    assert ready_doc.status == "ready"


def test_reaping_is_scoped_to_the_requesting_user(user, other_user):
    mine = _stale_doc(user)
    theirs = _stale_doc(other_user)

    _action_rag_list({}, _request_for(user))

    mine.refresh_from_db()
    theirs.refresh_from_db()
    assert mine.status == "error"
    # Another account's in-flight ingest must not be touched by my poll.
    assert theirs.status == "processing"


def test_rag_list_reaps_so_frontend_polling_terminates(user):
    _stale_doc(user, doc_status="processing")
    _stale_doc(user, doc_status="pending")

    resp = _action_rag_list({}, _request_for(user))

    statuses = [
        d["status"] for d in resp.data["data"]  # pyrefly: ignore[unsupported-operation]
    ]
    assert "processing" not in statuses
    assert "pending" not in statuses


@override_settings(RAG_INGEST_TIMEOUT_SECONDS=60)
def test_reap_timeout_is_configurable(user):
    past_timeout = _stale_doc(user, age_seconds=120)
    within_timeout = _stale_doc(user, age_seconds=30)

    _action_rag_list({}, _request_for(user))

    past_timeout.refresh_from_db()
    within_timeout.refresh_from_db()
    assert past_timeout.status == "error"
    assert within_timeout.status == "processing"


# ── Document-grounded generations ────────────────────────────────────────────
# Every tool, not just Ask My Docs, can be grounded in the caller's documents.


def _client_for(client_user):
    client = APIClient()
    client.force_authenticate(user=client_user)
    return client


def _chunk(doc, text=None, score=0.91):
    return {
        "text": text or "Newton's first law: an object stays at rest unless a net force acts on it.",
        "chunk_index": 0,
        "page_number": 1,
        "document_id": doc.id,
        "document_title": doc.title,
        "score": score,
    }


EXPLAIN_PAYLOAD = {
    "explanation": "e",
    "key_points": ["a"],
    "analogy": "x",
    "example": "y",
}


@patch("study_api.views.query_groq_json")
@patch("study_api.views.retrieve_chunks")
def test_generate_explain_is_grounded_in_selected_documents(
    mock_retrieve, mock_query, user, ready_doc
):
    mock_retrieve.return_value = [_chunk(ready_doc)]
    mock_query.return_value = EXPLAIN_PAYLOAD

    resp = _client_for(user).post(
        "/api/generate/",
        {"topic": "inertia", "type": "explain", "document_ids": [ready_doc.id]},
        format="json",
    )

    assert resp.status_code == 200
    assert mock_retrieve.call_args.args[0] == [ready_doc.id]
    prompt = mock_query.call_args.args[1]
    assert "SOURCE DOCUMENTS" in prompt
    assert "Physics Notes" in prompt
    assert "Newton's first law" in prompt
    assert resp.data["grounded_in"] == ["Physics Notes"]
    assert resp.data["sources"][0]["document_title"] == "Physics Notes"

    # History hydration reads the stored payload, so provenance has to be saved.
    generation = Generation.objects.get(id=resp.data["generation_id"])
    assert generation.result["sources"][0]["document_id"] == ready_doc.id


@patch("study_api.views.query_groq_structured")
@patch("study_api.views.retrieve_chunks")
def test_generate_quiz_and_flashcards_are_grounded_too(
    mock_retrieve, mock_query, user, ready_doc
):
    from study_api.schemas import QuizResponse

    mock_retrieve.return_value = [_chunk(ready_doc)]
    mock_query.return_value = QuizResponse.model_validate(
        {
            "questions": [
                {
                    "id": 1,
                    "question": "Q?",
                    "options": ["A) a", "B) b", "C) c", "D) d"],
                    "answer": "A) a",
                    "explanation": "because",
                }
            ]
        }
    )

    resp = _client_for(user).post(
        "/api/generate/",
        {"topic": "newton", "type": "quiz", "document_ids": [ready_doc.id]},
        format="json",
    )

    assert resp.status_code == 200
    assert "SOURCE DOCUMENTS" in mock_query.call_args.args[1]
    assert resp.data["grounded_in"] == ["Physics Notes"]


@patch("study_api.views.query_groq_json")
@patch("study_api.views.retrieve_chunks")
def test_small_selection_is_fed_whole_without_retrieval(
    mock_retrieve, mock_query, user, ready_doc
):
    ready_doc.raw_text = "Chapter one. Newton's first law of motion stated in full."
    ready_doc.save(update_fields=["raw_text"])
    mock_query.return_value = EXPLAIN_PAYLOAD

    resp = _client_for(user).post(
        "/api/generate/",
        {"topic": "inertia", "type": "explain", "document_ids": [ready_doc.id]},
        format="json",
    )

    assert resp.status_code == 200
    mock_retrieve.assert_not_called()
    prompt = mock_query.call_args.args[1]
    assert "stated in full" in prompt
    assert resp.data["grounded_in"] == ["Physics Notes"]
    assert resp.data["sources"][0]["document_id"] == ready_doc.id


@patch("study_api.views.query_groq_json")
@patch("study_api.views.retrieve_chunks")
def test_oversized_selection_falls_back_to_retrieval(
    mock_retrieve, mock_query, user, ready_doc
):
    from study_api import views

    ready_doc.raw_text = "x" * (views._FULL_DOC_CHAR_BUDGET + 1)
    ready_doc.save(update_fields=["raw_text"])
    mock_retrieve.return_value = [_chunk(ready_doc)]
    mock_query.return_value = EXPLAIN_PAYLOAD

    resp = _client_for(user).post(
        "/api/generate/",
        {"topic": "inertia", "type": "explain", "document_ids": [ready_doc.id]},
        format="json",
    )

    assert resp.status_code == 200
    mock_retrieve.assert_called_once()
    assert "Newton's first law" in mock_query.call_args.args[1]


@patch("study_api.views.query_groq_json")
@patch("study_api.views.retrieve_chunks")
def test_selection_with_an_unextracted_doc_falls_back_to_retrieval(
    mock_retrieve, mock_query, user, ready_doc
):
    # raw_text empty → whole-doc path must not silently drop this document.
    second = Document.objects.create(
        user=user,
        title="Extra Notes",
        filename="extra.txt",
        status="ready",
        raw_text="short and complete",
    )
    mock_retrieve.return_value = [_chunk(ready_doc)]
    mock_query.return_value = EXPLAIN_PAYLOAD

    resp = _client_for(user).post(
        "/api/generate/",
        {"topic": "inertia", "type": "explain", "document_ids": [ready_doc.id, second.id]},
        format="json",
    )

    assert resp.status_code == 200
    mock_retrieve.assert_called_once()


@patch("study_api.views.query_groq_structured")
def test_flashcards_retry_recovers_from_a_schema_violation(mock_query, user):
    from study_api.schemas import FlashcardsResponse

    good = FlashcardsResponse.model_validate(
        {"flashcards": [{"id": 1, "front": "Q", "back": "A", "hint": "h"}]}
    )
    mock_query.side_effect = [
        ValueError("flashcards.7.hint Field required"),
        good,
    ]

    resp = _client_for(user).post(
        "/api/generate/",
        {"topic": "career guidance retry", "type": "flashcards", "num_cards": 3},
        format="json",
    )

    assert resp.status_code == 200
    assert mock_query.call_count == 2
    assert resp.data["flashcards"][0]["hint"] == "h"


@patch("study_api.views.query_groq_structured")
def test_flashcards_second_schema_violation_surfaces_as_502(mock_query, user):
    mock_query.side_effect = ValueError("flashcards.7.hint Field required")

    resp = _client_for(user).post(
        "/api/generate/",
        {"topic": "career guidance twice failing", "type": "flashcards", "num_cards": 3},
        format="json",
    )

    assert resp.status_code == 502
    assert mock_query.call_count == 2
    assert "Failed to parse AI response" in resp.data["error"]


@patch("study_api.views.chat_groq")
@patch("study_api.views.retrieve_chunks")
def test_generate_chat_can_be_grounded(mock_retrieve, mock_chat, user, ready_doc):
    mock_retrieve.return_value = [_chunk(ready_doc)]
    mock_chat.return_value = "According to your notes, inertia keeps a body at rest."

    resp = _client_for(user).post(
        "/api/generate/",
        {"topic": "what is inertia?", "type": "chat", "document_ids": [ready_doc.id]},
        format="json",
    )

    assert resp.status_code == 200
    assert "SOURCE DOCUMENTS" in mock_chat.call_args.args[0]
    assert resp.data["grounded_in"] == ["Physics Notes"]


@patch("study_api.views.query_groq_json")
@patch("study_api.views.retrieve_chunks")
def test_generate_rejects_documents_that_are_not_ready_or_not_mine(
    mock_retrieve, mock_query, user, other_user
):
    foreign = Document.objects.create(
        user=other_user, title="Theirs", filename="t.txt", status="ready"
    )
    pending = Document.objects.create(
        user=user, title="Still indexing", filename="p.txt", status="processing"
    )

    resp = _client_for(user).post(
        "/api/generate/",
        {
            "topic": "gravity",
            "type": "explain",
            "document_ids": [foreign.id, pending.id],
        },
        format="json",
    )

    assert resp.status_code == 400
    assert not Generation.objects.exists()
    # A rejected document set must not fall through to an ungrounded answer.
    mock_retrieve.assert_not_called()
    mock_query.assert_not_called()


@patch("study_api.views.query_groq_json")
@patch("study_api.views.retrieve_chunks")
def test_generate_without_documents_behaves_exactly_as_before(
    mock_retrieve, mock_query, user, ready_doc
):
    mock_query.return_value = EXPLAIN_PAYLOAD

    resp = _client_for(user).post(
        "/api/generate/", {"topic": "gravity", "type": "explain"}, format="json"
    )

    assert resp.status_code == 200
    mock_retrieve.assert_not_called()
    assert "SOURCE DOCUMENTS" not in mock_query.call_args.args[1]
    assert "sources" not in resp.data


@patch("study_api.views.query_groq_json")
@patch("study_api.views.retrieve_chunks")
def test_retrieval_failure_does_not_generate(mock_retrieve, mock_query, user, ready_doc):
    mock_retrieve.side_effect = RuntimeError("embedding provider is down")

    resp = _client_for(user).post(
        "/api/generate/",
        {"topic": "gravity", "type": "explain", "document_ids": [ready_doc.id]},
        format="json",
    )

    assert resp.status_code == 503
    assert "embedding provider is down" in resp.data["error"]
    assert not Generation.objects.exists()
    mock_query.assert_not_called()


@patch("study_api.views.query_groq_json")
@patch("study_api.views.retrieve_chunks")
def test_empty_retrieval_reports_instead_of_answering_anyway(
    mock_retrieve, mock_query, user, ready_doc
):
    mock_retrieve.return_value = []

    resp = _client_for(user).post(
        "/api/generate/",
        {"topic": "quantum tunnelling", "type": "explain", "document_ids": [ready_doc.id]},
        format="json",
    )

    assert resp.status_code == 400
    assert not Generation.objects.exists()
    mock_query.assert_not_called()


@patch("study_api.views.query_groq_json")
@patch("study_api.views.retrieve_chunks")
def test_changed_documents_do_not_reuse_a_cached_answer(
    mock_retrieve, mock_query, user, ready_doc
):
    # Grounded context lives inside the hashed prompt, so a re-indexed or
    # different document must never serve the previously cached result.
    mock_query.return_value = EXPLAIN_PAYLOAD
    client = _client_for(user)
    body = {"topic": "inertia cache check", "type": "explain", "document_ids": [ready_doc.id]}

    mock_retrieve.return_value = [_chunk(ready_doc, text="First version of the notes.")]
    client.post("/api/generate/", body, format="json")

    mock_retrieve.return_value = [_chunk(ready_doc, text="Second version of the notes.")]
    client.post("/api/generate/", body, format="json")
    assert mock_query.call_count == 2

    # Same excerpts again: now the cache legitimately answers.
    client.post("/api/generate/", body, format="json")
    assert mock_query.call_count == 2


@patch("study_api.views.stream_chat_groq")
@patch("study_api.views.retrieve_chunks")
def test_chat_stream_is_grounded_and_cites_documents(
    mock_retrieve, mock_stream, user, ready_doc
):
    mock_retrieve.return_value = [_chunk(ready_doc)]
    mock_stream.return_value = ["Inertia ", "keeps bodies at rest."]

    resp = _client_for(user).post(
        "/api/chat/stream/",
        {"message": "what is inertia?", "document_ids": [ready_doc.id]},
        format="json",
    )

    assert resp.status_code == 200
    body = b"".join(resp.streaming_content).decode("utf-8")
    # The closing frame carries the citations for the reply that just streamed.
    assert "Physics Notes" in body

    system = mock_stream.call_args.args[0]
    assert "SOURCE DOCUMENTS" in system
    assert "an object stays at rest" in system


@patch("study_api.views.stream_chat_groq")
@patch("study_api.views.retrieve_chunks")
def test_chat_stream_refuses_documents_that_are_not_ready(mock_retrieve, mock_stream, user):
    pending = Document.objects.create(
        user=user, title="Later", filename="l.txt", status="processing"
    )

    resp = _client_for(user).post(
        "/api/chat/stream/",
        {"message": "what is inertia?", "document_ids": [pending.id]},
        format="json",
    )

    assert resp.status_code == 400
    mock_retrieve.assert_not_called()
    mock_stream.assert_not_called()


@patch("study_api.views.stream_chat_groq")
@patch("study_api.views.retrieve_chunks")
def test_chat_stream_without_documents_stays_ungrounded(mock_retrieve, mock_stream, user):
    mock_stream.return_value = ["plain answer"]

    resp = _client_for(user).post(
        "/api/chat/stream/", {"message": "what is inertia?"}, format="json"
    )

    assert resp.status_code == 200
    body = b"".join(resp.streaming_content).decode("utf-8")
    assert '"sources": []' in body
    mock_retrieve.assert_not_called()
    assert "SOURCE DOCUMENTS" not in mock_stream.call_args.args[0]
