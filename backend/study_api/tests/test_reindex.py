"""Tests for the reindex_documents management command and helper."""

from io import StringIO
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import CommandError

from study_api.models import Document, DocumentChunk
from study_api.rag_pipeline import reindex_document

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    return User.objects.create_user(username="reindex_user", password="password123")


@pytest.fixture
def doc_with_text(user):
    doc = Document.objects.create(
        user=user,
        title="Notes",
        filename="notes.txt",
        file_size=40,
        page_count=1,
        chunk_count=1,
        status="ready",
        raw_text="Newton's first law explains inertia and motion.",
    )
    DocumentChunk.objects.create(
        document=doc,
        chunk_index=0,
        text="old chunk",
        page_number=1,
        embedding=[0.1, 0.2, 0.3],
    )
    return doc


@patch("study_api.rag_pipeline.embed_texts")
def test_reindex_document_rebuilds_chunks(mock_embed, doc_with_text):
    mock_embed.return_value = [[1.0, 0.0, 0.0]]

    reindex_document(doc_with_text.id)

    doc_with_text.refresh_from_db()
    assert doc_with_text.status == "ready"
    chunks = list(DocumentChunk.objects.filter(document=doc_with_text).order_by("chunk_index"))
    assert len(chunks) >= 1
    assert "Newton" in chunks[0].text
    assert chunks[0].embedding == [1.0, 0.0, 0.0]


@patch("study_api.rag_pipeline.embed_texts")
def test_reindex_management_command(mock_embed, doc_with_text):
    mock_embed.return_value = [[0.5, 0.5, 0.0]]
    out = StringIO()
    call_command("reindex_documents", stdout=out)
    assert "succeeded" in out.getvalue().lower() or "1 succeeded" in out.getvalue()


@patch("study_api.rag_pipeline.embed_texts", side_effect=RuntimeError("embed down"))
def test_reindex_command_reports_failure(mock_embed, doc_with_text):
    with pytest.raises(CommandError):
        call_command("reindex_documents", verbosity=0)
    doc_with_text.refresh_from_db()
    assert doc_with_text.status == "error"
