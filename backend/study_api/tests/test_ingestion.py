"""The durable ingestion queue: uploads survive a restart and get retried."""

from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from study_api import ingestion
from study_api.dispatchers import _action_rag_document_status, _action_rag_upload
from study_api.models import Document, DocumentUpload

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    return User.objects.create_user(username="queueuser", password="a-Decent-passphrase-91")


def _request(user, **files):
    request = MagicMock()
    request.user = user
    request.FILES = files
    return request


def _queued(user, attempts=0, age_seconds=0, doc_status="pending"):
    doc = Document.objects.create(
        user=user, title="Notes", filename="n.txt", status=doc_status
    )
    DocumentUpload.objects.create(document=doc, data=b"hello world", attempts=attempts)
    Document.objects.filter(id=doc.id).update(
        updated_at=timezone.now() - timedelta(seconds=age_seconds)
    )
    return doc


@patch("study_api.dispatchers.kick_ingest_worker")
def test_upload_persists_bytes_and_wakes_worker(mock_kick, user):
    file = SimpleUploadedFile("bio.txt", b"Mitochondria", content_type="text/plain")

    resp = _action_rag_upload({"title": "Bio"}, _request(user, file=file))

    assert resp.status_code == 201
    doc = Document.objects.get(id=resp.data["data"]["id"])
    assert bytes(doc.upload.data) == b"Mitochondria"
    mock_kick.assert_called_once()


@patch("study_api.rag_pipeline.ingest_document")
def test_queue_processes_pending_documents_and_drops_the_bytes(mock_ingest, user):
    doc = _queued(user)

    assert ingestion.run_ingest_queue() == 1

    mock_ingest.assert_called_once_with(doc.id, b"hello world")
    assert not DocumentUpload.objects.filter(document=doc).exists()


@patch("study_api.rag_pipeline.ingest_document")
def test_queue_skips_documents_that_are_not_pending(mock_ingest, user):
    _queued(user, doc_status="processing")

    assert ingestion.run_ingest_queue() == 0
    mock_ingest.assert_not_called()


@patch("study_api.rag_pipeline.ingest_document")
def test_a_claimed_document_cannot_be_claimed_twice(mock_ingest, user):
    doc = _queued(user)

    first = ingestion._claim_next_document()
    second = ingestion._claim_next_document()

    assert first == doc.id
    assert second is None
    assert DocumentUpload.objects.get(document=doc).attempts == 1


@patch("study_api.rag_pipeline.ingest_document", side_effect=RuntimeError("boom"))
def test_a_crashing_document_does_not_stop_the_queue(mock_ingest, user):
    _queued(user)
    _queued(user)

    assert ingestion.run_ingest_queue() == 2


@patch("study_api.dispatchers.kick_ingest_worker")
def test_stale_document_with_stored_bytes_is_requeued_not_failed(mock_kick, user):
    doc = _queued(user, doc_status="processing", age_seconds=3600, attempts=1)

    resp = _action_rag_document_status({"document_id": doc.id}, _request(user))

    assert resp.data["data"]["status"] == "pending"
    mock_kick.assert_called_once()


@patch("study_api.dispatchers.kick_ingest_worker")
def test_stale_document_out_of_attempts_is_failed(mock_kick, user):
    doc = _queued(
        user,
        doc_status="processing",
        age_seconds=3600,
        attempts=ingestion.MAX_ATTEMPTS,
    )

    resp = _action_rag_document_status({"document_id": doc.id}, _request(user))

    assert resp.data["data"]["status"] == "error"
    mock_kick.assert_not_called()


def test_deleting_a_document_removes_its_queued_bytes(user):
    doc = _queued(user)
    doc.delete()
    assert DocumentUpload.objects.count() == 0
