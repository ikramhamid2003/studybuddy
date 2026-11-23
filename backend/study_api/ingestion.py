"""Durable document-ingestion queue backed by the database.

Uploaded bytes are stored in a DocumentUpload row until ingestion finishes, so a
restart or deploy mid-ingest no longer destroys the work: the stale-document
reaper puts the document back in the queue (up to MAX_ATTEMPTS times) and any
worker picks it up again.

There is deliberately no broker. A claim is an atomic ``UPDATE ... WHERE
status='pending'``, which is portable across SQLite and Postgres and safe with
several gunicorn workers. An in-process daemon thread drains the queue on
upload; ``manage.py process_ingest_queue`` can run the same loop as a separate
worker once the deployment has one.
"""

import logging
import threading

from django.conf import settings
from django.db import close_old_connections, connection
from django.db.models import F
from django.utils import timezone

from .models import Document, DocumentUpload

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 3

_worker_lock = threading.Lock()
_worker_running = False


def enqueue(document: Document, data: bytes) -> None:
    """Persist the upload bytes so the work survives a restart."""

    DocumentUpload.objects.create(document=document, data=data)


def _claim_next_document() -> int | None:
    """Atomically move one pending document to 'processing' and return its id."""

    candidates = (
        DocumentUpload.objects.filter(document__status="pending")
        .order_by("created_at")
        .values_list("document_id", flat=True)[:5]
    )
    for doc_id in list(candidates):
        claimed = Document.objects.filter(id=doc_id, status="pending").update(
            status="processing", updated_at=timezone.now()
        )
        if claimed == 1:
            DocumentUpload.objects.filter(document_id=doc_id).update(
                attempts=F("attempts") + 1
            )
            return doc_id
    return None


def _process(doc_id: int) -> None:
    from .rag_pipeline import ingest_document

    upload = DocumentUpload.objects.filter(document_id=doc_id).first()
    if upload is None:
        Document.objects.filter(id=doc_id).update(
            status="error",
            error_message="The uploaded file is no longer available. Please upload it again.",
            updated_at=timezone.now(),
        )
        return
    try:
        # ingest_document records 'ready' or 'error' on the document itself.
        ingest_document(doc_id, bytes(upload.data))
    finally:
        # Success or failure, the bytes are done: raw_text is kept on the
        # Document for reindexing, and a failed parse will not improve on retry.
        # A crash before this line leaves the row for the reaper to requeue.
        DocumentUpload.objects.filter(document_id=doc_id).delete()


def run_ingest_queue() -> int:
    """Process pending documents until none are left; returns how many ran."""

    processed = 0
    while True:
        doc_id = _claim_next_document()
        if doc_id is None:
            return processed
        try:
            _process(doc_id)
        except Exception:
            logger.exception("Ingestion worker failed on document %s", doc_id)
        processed += 1


def _has_pending() -> bool:
    return DocumentUpload.objects.filter(document__status="pending").exists()


def _worker_main() -> None:
    global _worker_running
    try:
        while True:
            run_ingest_queue()
            # Re-check under the lock so an upload that landed after the last
            # claim is not stranded by a worker that is about to exit.
            with _worker_lock:
                if not _has_pending():
                    _worker_running = False
                    return
    except Exception:
        logger.exception("Ingestion worker thread crashed")
        with _worker_lock:
            _worker_running = False
    finally:
        close_old_connections()
        connection.close()


def kick_worker() -> None:
    """Ensure a background thread is draining the queue in this process."""

    global _worker_running
    if not getattr(settings, "RAG_START_WORKER_THREAD", True):
        return
    with _worker_lock:
        if _worker_running:
            return
        _worker_running = True
    threading.Thread(target=_worker_main, daemon=True, name="ingest-worker").start()
