from django.contrib.auth.models import User
from rest_framework import serializers

from .models import ChatMessage, ChatSession


class ExplainSerializer(serializers.Serializer):
    topic = serializers.CharField(max_length=300, required=True)
    level = serializers.ChoiceField(
        choices=["beginner", "intermediate", "advanced"], default="beginner"
    )


class SummarizeSerializer(serializers.Serializer):
    notes = serializers.CharField(min_length=20, max_length=8000, required=True)
    format = serializers.ChoiceField(
        choices=["bullets", "paragraph", "outline"], default="bullets"
    )


class QuizSerializer(serializers.Serializer):
    topic = serializers.CharField(max_length=300, required=True)
    num_questions = serializers.IntegerField(min_value=1, max_value=8, default=5)
    difficulty = serializers.ChoiceField(
        choices=["easy", "medium", "hard"], default="medium"
    )


class FlashcardsSerializer(serializers.Serializer):
    topic = serializers.CharField(max_length=300, required=True)
    num_cards = serializers.IntegerField(min_value=3, max_value=15, default=8)


class ChatMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(max_length=4000)


class ChatSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000, required=True)
    history = ChatMessageSerializer(many=True, required=False, default=list)
    session_id = serializers.IntegerField(required=False, allow_null=True)


class RegisterSerializer(serializers.ModelSerializer):
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
