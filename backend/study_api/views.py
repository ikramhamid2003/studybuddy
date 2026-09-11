import hashlib
import json

from django.core.cache import cache
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .langchain_client import (
    chat_groq,
    query_groq_json,
    query_groq_structured,
    stream_chat_groq,
)
from .models import ChatMessage, ChatSession
from .schemas import FlashcardsResponse, QuizResponse
from .serializers import (
    ChatSerializer,
    ChatSessionDetailSerializer,
    ChatSessionRenameSerializer,
    ChatSessionSerializer,
    ExplainSerializer,
    FlashcardsSerializer,
    QuizSerializer,
    RegisterSerializer,
    SummarizeSerializer,
)

# ── Prompts ────────────────────────────────────────────────────────────────────

EXPLAIN_SYSTEM = (
    "You are an expert tutor. Your task is to explain a concept clearly. "
    "Always respond with ONLY a valid JSON object — no markdown fences, no extra text. "
    "Use exactly this format: "
    '{"explanation":"clear explanation text","key_points":["point 1","point 2","point 3"],'
    '"analogy":"a simple real-world analogy","example":"a concrete example"}'
)

SUMMARIZE_SYSTEM = (
    "You are an expert at condensing academic study material. "
    "Always respond with ONLY a valid JSON object — no markdown fences, no extra text. "
    "Use exactly this format: "
    '{"summary":"concise summary paragraph","key_concepts":["concept 1","concept 2","concept 3"],'
    '"important_terms":[{"term":"term name","definition":"brief definition"}],'
    '"study_tips":["tip 1","tip 2"]}'
)

QUIZ_SYSTEM = (
    "You are a quiz generator for students. "
    "Always respond with ONLY a valid JSON object — no markdown, no extra text. "
    "Use exactly this format: "
    '{"questions":[{"id":1,"question":"question text",'
    '"options":["A) option","B) option","C) option","D) option"],'
    '"answer":"A) option","explanation":"why this is correct"}]}'
)

FLASHCARDS_SYSTEM = (
    "You are a study flashcard creator. "
    "Always respond with ONLY a valid JSON object — no markdown, no extra text. "
    "Use exactly this format: "
    '{"flashcards":[{"id":1,"front":"term or question","back":"definition or answer","hint":"short memory hint"}]}'
)

CHAT_SYSTEM = (
    "You are a friendly, knowledgeable study buddy AI assistant. "
    "Help students understand concepts, answer questions, and guide their learning. "
    "Be encouraging, clear, and concise. Use examples when helpful. "
    "Format responses in plain text — no JSON needed."
)


# ── Views ──────────────────────────────────────────────────────────────────────


def _auto_title(message: str) -> str:
    """Derive a short sidebar title from the first message of a session."""
    title = message.strip().splitlines()[0]
    return title[:47] + "…" if len(title) > 47 else title


class ExplainView(APIView):
    """POST /api/explain/ — Explain a concept at a given level."""

    def post(self, request):
        serializer = ExplainSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        topic = serializer.validated_data["topic"]
        level = serializer.validated_data["level"]

        user_msg = (
            f'Explain the concept of "{topic}" at a {level} level. '
            "Be engaging, clear, and use simple language where possible."
        )

        try:
            cache_key = "explain_" + hashlib.md5(user_msg.encode()).hexdigest()
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data, status=status.HTTP_200_OK)

            data = query_groq_json(EXPLAIN_SYSTEM, user_msg, max_tokens=700)
            cache.set(cache_key, data, timeout=60 * 60 * 24 * 7)
            return Response(data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"error": f"Failed to parse AI response: {e!s}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as e:  # noqa: BLE001
            return Response(
                {"error": f"AI request failed: {e!s}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class SummarizeView(APIView):
    """POST /api/summarize/ — Summarize study notes."""

    def post(self, request):
        serializer = SummarizeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        notes = serializer.validated_data["notes"]
        fmt = serializer.validated_data["format"]

        user_msg = (
            f"Summarize the following study notes in {fmt} format. "
            "Extract the key concepts, define important terms, and provide study tips.\n\n"
            f"NOTES:\n{notes}"
        )

        try:
            cache_key = "summarize_" + hashlib.md5(user_msg.encode()).hexdigest()
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data, status=status.HTTP_200_OK)

            data = query_groq_json(SUMMARIZE_SYSTEM, user_msg, max_tokens=800)
            cache.set(cache_key, data, timeout=60 * 60 * 24 * 7)
            return Response(data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"error": f"Failed to parse AI response: {e!s}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as e:  # noqa: BLE001
            return Response(
                {"error": f"AI request failed: {e!s}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class QuizView(APIView):
    """POST /api/quiz/ — Generate multiple-choice quiz questions."""

    def post(self, request):
        serializer = QuizSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        topic = serializer.validated_data["topic"]
        num_questions = serializer.validated_data["num_questions"]
        difficulty = serializer.validated_data["difficulty"]

        user_msg = (
            f'Generate exactly {num_questions} multiple-choice quiz questions about "{topic}" '
            f"at {difficulty} difficulty level. Each question must have 4 options (A, B, C, D), "
            "one correct answer, and a brief explanation."
        )

        try:
            cache_key = "quiz_" + hashlib.md5(user_msg.encode()).hexdigest()
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data, status=status.HTTP_200_OK)

            parsed = query_groq_structured(
                QUIZ_SYSTEM, user_msg, QuizResponse, max_tokens=1000
            )
            data = parsed.model_dump()
            cache.set(cache_key, data, timeout=60 * 60 * 24 * 7)
            return Response(data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"error": f"Failed to parse quiz: {e!s}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as e:  # noqa: BLE001
            return Response(
                {"error": f"AI request failed: {e!s}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class FlashcardsView(APIView):
    """POST /api/flashcards/ — Generate study flashcards."""

    def post(self, request):
        serializer = FlashcardsSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        topic = serializer.validated_data["topic"]
        num_cards = serializer.validated_data["num_cards"]

        user_msg = (
            f'Create exactly {num_cards} study flashcards for the topic: "{topic}". '
            "Mix definitions, concepts, and application-type questions. "
            "Each card should have a short hint to help with memorization."
        )

        try:
            cache_key = (
                "flashcards_" + hashlib.md5(user_msg.encode()).hexdigest()
            )
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data, status=status.HTTP_200_OK)

            parsed = query_groq_structured(
                FLASHCARDS_SYSTEM, user_msg, FlashcardsResponse, max_tokens=900
            )
            data = parsed.model_dump()
            cache.set(cache_key, data, timeout=60 * 60 * 24 * 7)
            return Response(data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"error": f"Failed to parse flashcards: {e!s}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as e:  # noqa: BLE001
            return Response(
                {"error": f"AI request failed: {e!s}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class ChatView(APIView):
    """POST /api/chat/ — Multi-turn study assistant chat.

    If `session_id` is provided, history is loaded from the stored session
    (client-sent `history` is ignored in that case) and the new turn is
    persisted. Without `session_id`, behaves exactly as before (stateless,
    client-managed history) for backward compatibility.
    """

    def post(self, request):
        serializer = ChatSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        message = serializer.validated_data["message"]
        session_id = serializer.validated_data.get("session_id")

        session = None
        if session_id is not None:
            session = get_object_or_404(ChatSession, id=session_id, user=request.user)
            history = [
                {"role": m.role, "content": m.content} for m in session.messages.all()
            ][-6:]
        else:
            history = serializer.validated_data.get("history", [])[-6:]

        try:
            reply = chat_groq(CHAT_SYSTEM, history, message, max_tokens=600)

            if session is not None:
                is_first_turn = not session.messages.exists()
                ChatMessage.objects.create(session=session, role="user", content=message)
                ChatMessage.objects.create(session=session, role="assistant", content=reply)
                if is_first_turn:
                    session.title = _auto_title(message)
                session.save()  # bumps updated_at

            return Response(
                {"reply": reply, "session_id": session.id if session else None},
                status=status.HTTP_200_OK,
            )
        except Exception as e:  # noqa: BLE001
            return Response(
                {"error": f"AI request failed: {e!s}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class ChatStreamView(APIView):
    """POST /api/chat/stream/ — Stream multi-turn study assistant chat.

    Same session semantics as ChatView, adapted for streaming: the full
    reply is accumulated as it streams and persisted once the stream ends.
    """

    def post(self, request):
        serializer = ChatSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        message = serializer.validated_data["message"]
        session_id = serializer.validated_data.get("session_id")

        session = None
        if session_id is not None:
            session = get_object_or_404(ChatSession, id=session_id, user=request.user)
            history = [
                {"role": m.role, "content": m.content} for m in session.messages.all()
            ][-6:]
        else:
            history = serializer.validated_data.get("history", [])[-6:]

        def event_generator():
            full_reply_parts = []
            try:
                for chunk in stream_chat_groq(CHAT_SYSTEM, history, message, max_tokens=600):
                    full_reply_parts.append(chunk)
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n".encode()

                if session is not None:
                    is_first_turn = not session.messages.exists()
                    full_reply = "".join(full_reply_parts)
                    ChatMessage.objects.create(session=session, role="user", content=message)
                    ChatMessage.objects.create(
                        session=session, role="assistant", content=full_reply
                    )
                    if is_first_turn:
                        session.title = _auto_title(message)
                    session.save()

                yield f"data: {json.dumps({'done': True, 'session_id': session.id if session else None})}\n\n".encode()
            except Exception as e:  # noqa: BLE001
                yield f"data: {json.dumps({'error': str(e)})}\n\n".encode()

        response = StreamingHttpResponse(
            event_generator(), content_type="text/event-stream"
        )
        response["X-Accel-Buffering"] = "no"
        response["Cache-Control"] = "no-cache"
        return response


class ChatSessionListCreateView(APIView):
    """GET /api/sessions/ — list the user's chats (sidebar).
    POST /api/sessions/ — start a new empty chat, returns its id."""

    def get(self, request):
        sessions = ChatSession.objects.filter(user=request.user)
        return Response(ChatSessionSerializer(sessions, many=True).data)

    def post(self, request):
        session = ChatSession.objects.create(user=request.user)
        return Response(
            ChatSessionSerializer(session).data, status=status.HTTP_201_CREATED
        )


class ChatSessionDetailView(APIView):
    """GET /api/sessions/<id>/ — full chat with messages.
    PATCH /api/sessions/<id>/ — rename.
    DELETE /api/sessions/<id>/ — delete."""

    def get(self, request, pk):
        session = get_object_or_404(ChatSession, id=pk, user=request.user)
        return Response(ChatSessionDetailSerializer(session).data)

    def patch(self, request, pk):
        session = get_object_or_404(ChatSession, id=pk, user=request.user)
        serializer = ChatSessionRenameSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        session.title = serializer.validated_data["title"]
        session.save()
        return Response(ChatSessionSerializer(session).data)

    def delete(self, request, pk):
        session = get_object_or_404(ChatSession, id=pk, user=request.user)
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RegisterView(APIView):
    """POST /api/auth/register/ — Register a new user."""

    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {
                    "message": "User registered successfully",
                    "user": {
                        "username": user.username,
                        "email": user.email,
                    },
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
