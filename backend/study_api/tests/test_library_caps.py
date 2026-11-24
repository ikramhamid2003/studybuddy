"""Per-user library caps: bounded embedding spend and storage."""

from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from study_api.dispatchers import _action_rag_upload
from study_api.models import Document, DocumentChunk
from study_api.rag_pipeline import _rechunk_and_embed

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    return User.objects.create_user(username="capuser", password="a-Decent-passphrase-91")


def _upload(user):
    request = MagicMock()
    request.user = user
    request.FILES = {"file": SimpleUploadedFile("n.txt", b"hello", content_type="text/plain")}
    return _action_rag_upload({"title": "N"}, request)


@override_settings(RAG_MAX_DOCUMENTS_PER_USER=2)
@patch("study_api.dispatchers.kick_ingest_worker")
def test_upload_refused_at_document_cap(_kick, user):
    assert _upload(user).status_code == 201
    assert _upload(user).status_code == 201

    resp = _upload(user)

    assert resp.status_code == 409
    assert "up to 2 documents" in resp.data["error"]
    assert Document.objects.filter(user=user).count() == 2


@override_settings(RAG_MAX_DOCUMENTS_PER_USER=1)
@patch("study_api.dispatchers.kick_ingest_worker")
def test_document_cap_is_per_user(_kick, user):
    other = User.objects.create_user(username="other", password="a-Decent-passphrase-91")
    assert _upload(user).status_code == 201
    assert _upload(other).status_code == 201


@override_settings(RAG_MAX_DOCUMENTS_PER_USER=0)
@patch("study_api.dispatchers.kick_ingest_worker")
def test_document_cap_of_zero_disables_the_check(_kick, user):
    for _ in range(3):
        assert _upload(user).status_code == 201


def _doc(user, title="D"):
    return Document.objects.create(user=user, title=title, filename="d.txt", status="processing")


def _fake_chunks(n):
    return [{"text": f"chunk {i}", "chunk_index": i, "page_number": 1} for i in range(n)]


@override_settings(RAG_MAX_CHUNKS_PER_DOCUMENT=3, RAG_MAX_CHUNKS_PER_USER=0)
def test_oversized_document_is_rejected_before_embedding(user):
    doc = _doc(user)
    with (
        patch("study_api.rag_pipeline.chunk_text", return_value=_fake_chunks(4)),
        patch("study_api.rag_pipeline.embed_texts") as embed,
        pytest.raises(ValueError, match="too large to index"),
    ):
        _rechunk_and_embed(doc, "text", 1)
    embed.assert_not_called()  # no money spent on a document that will be refused


@override_settings(RAG_MAX_CHUNKS_PER_DOCUMENT=0, RAG_MAX_CHUNKS_PER_USER=5)
def test_user_chunk_budget_counts_other_documents(user):
    existing = _doc(user, "old")
    DocumentChunk.objects.bulk_create(
        [DocumentChunk(document=existing, chunk_index=i, text="t", embedding=[0.0]) for i in range(4)]
    )
    doc = _doc(user, "new")
    with (
        patch("study_api.rag_pipeline.chunk_text", return_value=_fake_chunks(2)),
        patch("study_api.rag_pipeline.embed_texts") as embed,
        pytest.raises(ValueError, match="library is full"),
    ):
        _rechunk_and_embed(doc, "text", 1)
    embed.assert_not_called()


@override_settings(RAG_MAX_CHUNKS_PER_DOCUMENT=0, RAG_MAX_CHUNKS_PER_USER=5)
def test_reindex_does_not_count_the_documents_own_chunks(user):
    doc = _doc(user)
    DocumentChunk.objects.bulk_create(
        [DocumentChunk(document=doc, chunk_index=i, text="t", embedding=[0.0]) for i in range(5)]
    )
    with (
        patch("study_api.rag_pipeline.chunk_text", return_value=_fake_chunks(5)),
        patch("study_api.rag_pipeline.embed_texts", return_value=[[0.0]] * 5),
    ):
        _rechunk_and_embed(doc, "text", 1)  # replaces its own 5; must not trip the cap
    assert DocumentChunk.objects.filter(document=doc).count() == 5
