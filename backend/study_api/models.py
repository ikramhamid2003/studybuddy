from django.conf import settings
from django.db import models


class ChatSession(models.Model):
    """A single named conversation thread, like a ChatGPT sidebar entry."""

    # Sessions are owned per user so chat history never leaks across accounts.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_sessions"
    )
    title = models.CharField(max_length=100, default="New Chat")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = models.Manager()

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.title} ({self.user.username})"


class ChatMessage(models.Model):
    """A single turn within a ChatSession."""

    # Restrict roles to the two message types LangChain expects downstream.
    ROLE_CHOICES = [("user", "user"), ("assistant", "assistant")]

    session = models.ForeignKey(
        ChatSession, on_delete=models.CASCADE, related_name="messages"
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    objects = models.Manager()

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.role}: {self.content[:40]}"


class Generation(models.Model):
    """A persisted AI generation, tagged with the tool type that produced it.

    Turns the stateless one-shot tool endpoints into stateful history: every
    generation made through /api/generate/ is stored with its type so it can
    be listed, filtered, and re-opened later.
    """

    TYPE_CHOICES = [
        ("explain", "Explain"),
        ("summarize", "Summarize"),
        ("quiz", "Quiz"),
        ("flashcards", "Flashcards"),
        ("chat", "Chat"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="generations",
    )
    # `type` lets the same table back every tool's history view.
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, db_index=True)
    topic = models.CharField(max_length=8000)
    result = models.JSONField(default=dict)
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    cost = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = models.Manager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"], name="study_api_gen_user_created"),
            models.Index(fields=["user", "type", "created_at"], name="study_api_gen_usr_type_created"),
        ]

    def __str__(self):
        return f"{self.type}: {self.topic[:40]}"


class UsageLog(models.Model):
    """Track per-user token usage and estimated cost."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="usage_logs",
    )
    generation = models.ForeignKey(
        Generation,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="usage_logs",
    )
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = models.Manager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"], name="study_api_usage_user_created"),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.input_tokens} in / {self.output_tokens} out @ {self.estimated_cost}"


class Document(models.Model):
    """A study document uploaded by the user for RAG-powered Q&A.

    The file content is extracted on upload, chunked, embedded, and stored in
    DocumentChunk. The Document record itself keeps metadata and processing
    state so the frontend can show progress and allow deletion.
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("ready", "Ready"),
        ("error", "Error"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    title = models.CharField(max_length=500)
    filename = models.CharField(max_length=500)
    file_size = models.IntegerField(default=0)   # bytes
    page_count = models.IntegerField(default=0)
    chunk_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending", db_index=True)
    error_message = models.TextField(blank=True)
    # Extracted plain text kept so `reindex_documents` can rebuild chunks after
    # embedding-model / chunk-size changes without needing the original upload.
    raw_text = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = models.Manager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"], name="study_api_doc_user_created"),
        ]

    def __str__(self):
        return f"{self.title} ({self.user.username})"


class DocumentChunk(models.Model):
    """A single text chunk from a Document, with its embedding vector.

    The embedding is stored as a JSONField (list of floats) for maximum
    database portability — pgvector similarity search is performed in the
    RAG pipeline via a raw SQL query when PostgreSQL is available, and falls
    back to in-process numpy cosine similarity otherwise.
    """

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="chunks",
    )
    # Sequential index within the document — used for provenance.
    chunk_index = models.IntegerField()
    # The raw extracted text for this chunk.
    text = models.TextField()
    # page number(s) this chunk came from (best-effort for PDFs)
    page_number = models.IntegerField(null=True, blank=True)
    # Embedding stored as a JSON array of floats for portability.
    # For pgvector-backed retrieval the RAG pipeline uses raw SQL.
    embedding = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = models.Manager()

    class Meta:
        ordering = ["document", "chunk_index"]
        indexes = [
            models.Index(fields=["document", "chunk_index"], name="study_api_chunk_document_idx"),
        ]

    def __str__(self):
        return f"Chunk {self.chunk_index} of {self.document.title}"
