from django.contrib.auth.models import User
from rest_framework import serializers

from .models import ChatMessage, ChatSession, Generation


class ChatMessageSerializer(serializers.Serializer):
    """Inbound chat turn used before messages are persisted."""

    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(max_length=4000)


class ChatSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000, required=True)
    history = ChatMessageSerializer(many=True, required=False, default=list)
    session_id = serializers.IntegerField(required=False, allow_null=True)


class RegisterSerializer(serializers.ModelSerializer):
    """Registration payload that delegates password hashing to create_user."""

    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ("username", "email", "password")

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        return user


# ── Chat session persistence ────────────────────────────────────────────────


class ChatMessageModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ("id", "role", "content", "created_at")


class ChatSessionSerializer(serializers.ModelSerializer):
    """Lightweight — used for the sidebar list. No messages included."""

    class Meta:
        model = ChatSession
        fields = ("id", "title", "created_at", "updated_at")


class ChatSessionDetailSerializer(serializers.ModelSerializer):
    """Full session detail, including every message — used when opening a chat."""

    messages = ChatMessageModelSerializer(many=True, read_only=True)

    class Meta:
        model = ChatSession
        fields = ("id", "title", "created_at", "updated_at", "messages")


class ChatSessionRenameSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=100, required=True)


# ── Unified generation (ALL page) ───────────────────────────────────────────


class GenerateChatTurnSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(max_length=4000)


class GenerateSerializer(serializers.Serializer):
    """Shared request shape for every AI tool on the unified endpoint."""

    topic = serializers.CharField(max_length=8000, required=True)
    type = serializers.ChoiceField(
        choices=["explain", "summarize", "quiz", "flashcards", "chat"],
        required=True,
    )
    # Optional per-tool params — each applies only to its own tool and falls
    # back to the same defaults the dedicated tool serializers use.
    level = serializers.ChoiceField(
        choices=["beginner", "intermediate", "advanced"], default="beginner"
    )
    format = serializers.ChoiceField(
        choices=["bullets", "paragraph", "outline"], default="bullets"
    )
    num_questions = serializers.IntegerField(min_value=1, max_value=8, default=5)
    difficulty = serializers.ChoiceField(
        choices=["easy", "medium", "hard"], default="medium"
    )
    num_cards = serializers.IntegerField(min_value=3, max_value=15, default=8)
    history = GenerateChatTurnSerializer(many=True, required=False, default=list)


class GenerationModelSerializer(serializers.ModelSerializer):
    """Serialized saved result shown in tool history panels."""

    class Meta:
        model = Generation
        fields = ("id", "type", "topic", "result", "created_at")
