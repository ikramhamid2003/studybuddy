from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import ChatMessage, ChatSession, Generation


class UsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds the username to the access token's payload.

    simplejwt's default claims carry only `user_id`, so the frontend — which
    decodes the JWT locally to name the signed-in user — fell back to a generic
    label. Embedding `username` lets it show the real handle without an extra
    profile request.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        return token


class ChatMessageSerializer(serializers.Serializer):
    """Inbound chat turn used before messages are persisted.

    "system" is accepted because the Study Chat page sends the user's other
    session titles as a system turn; only user/assistant messages are stored.
    """

    role = serializers.ChoiceField(choices=["user", "assistant", "system"])
    content = serializers.CharField(max_length=4000)


class ChatSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000, required=True)
    history = ChatMessageSerializer(many=True, required=False, default=list)
    session_id = serializers.IntegerField(required=False, allow_null=True)
    # Same optional grounding contract as GenerateSerializer: retrieve from
    # these documents before answering, or stay ungrounded when absent.
    document_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
        max_length=25,
        default=list,
    )


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


# ── AI Tool Generations (All-in-One Studio) ──────────────────────────────────


class GenerateChatTurnSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(max_length=4000)


class GenerateSerializer(serializers.Serializer):
    """Shared request shape for every AI tool in the Studio."""

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
    # When present, every tool retrieves from these documents and grounds its
    # answer in the excerpts. Absent or empty keeps the pre-RAG behaviour.
    document_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
        max_length=25,
        default=list,
    )


class GenerationModelSerializer(serializers.ModelSerializer):
    """Serialized saved result shown in tool history panels."""

    class Meta:
        model = Generation
        fields = ("id", "type", "topic", "result", "created_at")
