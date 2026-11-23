from django.core.management.base import BaseCommand

from study_api.ingestion import run_ingest_queue


class Command(BaseCommand):
    help = "Process every pending document upload, then exit."

    def handle(self, *args, **options):
        count = run_ingest_queue()
        self.stdout.write(f"Processed {count} document(s).")
