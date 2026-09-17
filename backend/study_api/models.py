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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.type}: {self.topic[:40]}"
