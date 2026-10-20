"""Rebuild DocumentChunk embeddings using the current RAG configuration.

Usage:
    python manage.py reindex_documents
    python manage.py reindex_documents --document-id 42
    python manage.py reindex_documents --status ready

Run this after changing RAG_EMBED_MODEL, RAG_EMBED_DIMENSIONS, RAG_CHUNK_SIZE,
or RAG_CHUNK_OVERLAP. Documents without stored text (and without existing
chunks) are skipped with an error status.
"""

from django.core.management.base import BaseCommand, CommandError

from study_api.models import Document
from study_api.rag_pipeline import reindex_document


class Command(BaseCommand):
    help = "Re-chunk and re-embed all (or selected) RAG documents with current settings."

    def add_arguments(self, parser):
        parser.add_argument(
            "--document-id",
            type=int,
            action="append",
            dest="document_ids",
            help="Limit to one or more document IDs (repeatable).",
        )
        parser.add_argument(
            "--status",
            choices=["ready", "error", "pending", "processing", "all"],
            default="ready",
            help="Which documents to reindex (default: ready).",
        )

    def handle(self, *args, **options):
        qs = Document.objects.all().order_by("id")
        document_ids = options.get("document_ids")
        status_filter = options.get("status") or "ready"

        if document_ids:
            qs = qs.filter(id__in=document_ids)
        elif status_filter != "all":
            qs = qs.filter(status=status_filter)

        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.WARNING("No documents matched."))
            return

        self.stdout.write(f"Reindexing {total} document(s)…")
        ok = 0
        failed = 0
        for doc in qs.iterator():
            self.stdout.write(f"  [{doc.id}] {doc.title} … ", ending="")
            try:
                reindex_document(doc.id)
                ok += 1
                self.stdout.write(self.style.SUCCESS("ready"))
            except Exception as exc:  # noqa: BLE001
                failed += 1
                self.stdout.write(self.style.ERROR(f"error: {exc}"))

        summary = f"Done. {ok} succeeded, {failed} failed."
        if failed:
            self.stdout.write(self.style.WARNING(summary))
            raise CommandError(summary)
        self.stdout.write(self.style.SUCCESS(summary))
