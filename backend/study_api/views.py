import hashlib
import json

from django.core.cache import cache
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .content_fetcher import process_topic_with_url
from .dispatchers import ACTION_MAP, PUBLIC_ACTIONS

# pyrefly: ignore [missing-import]
from .langchain_client import (
    chat_groq,
    query_groq_json,
    query_groq_structured,
    stream_chat_groq,
)

# pyrefly: ignore [missing-import]
from .models import ChatMessage, ChatSession, Generation

# pyrefly: ignore [missing-import]
from .schemas import FlashcardsResponse, QuizResponse

# pyrefly: ignore [missing-import]
from .serializers import (
    ChatSerializer,
    ChatSessionDetailSerializer,
    ChatSessionRenameSerializer,
    ChatSessionSerializer,
    GenerateSerializer,
    GenerationModelSerializer,
    RegisterSerializer,
)

# ── Prompts ────────────────────────────────────────────────────────────────────

EXPLAIN_SYSTEM = (
    "You are an expert tutor. Your task is to explain a concept clearly based on the provided content. "
    "If the user provides a URL, base your explanation on the actual content from that webpage. "
    "Always respond with ONLY a valid JSON object — no markdown fences, no extra text. "
    "Use exactly this format: "
    '{"explanation":"clear explanation text based on the provided content","key_points":["point 1","point 2","point 3"],'
    '"analogy":"a simple real-world analogy","example":"a concrete example"}'
)

SUMMARIZE_SYSTEM = (
    "You are an expert at condensing academic study material. "
    "If the user provides a URL or web content, summarize the actual content from that page. "
    "Always respond with ONLY a valid JSON object — no markdown fences, no extra text. "
    "Use exactly this format: "
    '{"summary":"concise summary of the provided content","key_concepts":["concept 1","concept 2","concept 3"],'
    '"important_terms":[{"term":"term name","definition":"brief definition"}],'
    '"study_tips":["tip 1","tip 2"]}'
)

QUIZ_SYSTEM = (
    "You are a quiz generator for students. "
    "If the user provides a URL or web content, generate questions based on the actual content from that page. "
    "Always respond with ONLY a valid JSON object — no markdown, no extra text. "
    "Use exactly this format: "
    '{"questions":[{"id":1,"question":"question text based on the provided content",'
    '"options":["A) option","B) option","C) option","D) option"],'
    '"answer":"A) option","explanation":"why this is correct"}]}'
)

FLASHCARDS_SYSTEM = (
    "You are a study flashcard creator. "
    "If the user provides a URL or web content, create flashcards based on the actual content from that page. "
    "Always respond with ONLY a valid JSON object — no markdown, no extra text. "
    "Use exactly this format: "
    '{"flashcards":[{"id":1,"front":"term or question from the content","back":"definition or answer","hint":"short memory hint"}]}'
)

CHAT_SYSTEM = (
    "You are a friendly, knowledgeable study buddy AI assistant. "
    "Help students understand concepts, answer questions, and guide their learning. "
    "If the user shares a URL or web content, use that content to provide specific, relevant answers. "
    "Be encouraging, clear, and concise. Use examples when helpful. "
    "Format responses in plain text — no JSON needed."
)


# ── Shared tool cores ──────────────────────────────────────────────────────────
# Each function takes validated data and returns a Response. They are used both
# by the individual tool endpoints and by GenerateView (the ALL page), so every
# tool behaves identically no matter which entry point calls it.


def _cached_json_response(prefix, user_msg, system, llm_call):
    """Cache-wrapped LLM call shared by all JSON-returning tools."""
    try:
        # The full prompt text is the cache key input so different options do
        # not accidentally share the same model response.
        cache_key = prefix + hashlib.md5(user_msg.encode()).hexdigest()
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        data = llm_call(system, user_msg)
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


def _explain_response(validated):
    """Build the explain prompt and return a cached JSON tool response."""

    topic = validated["topic"]
    level = validated["level"]

    user_msg = (
        f'Explain the concept of "{topic}" at a {level} level. '
        "Be engaging, clear, and use simple language where possible."
    )

    def call(system, msg):
        return query_groq_json(system, msg, max_tokens=700)

    return _cached_json_response("explain_", user_msg, EXPLAIN_SYSTEM, call)


def _summarize_response(validated):
    """Build the summarizer prompt and return a cached JSON tool response."""

    notes = validated["notes"]
    fmt = validated["format"]

    user_msg = (
        f"Summarize the following study notes in {fmt} format. "
        "Extract the key concepts, define important terms, and provide study tips.\n\n"
        f"NOTES:\n{notes}"
    )

    def call(system, msg):
        return query_groq_json(system, msg, max_tokens=800)

    return _cached_json_response("summarize_", user_msg, SUMMARIZE_SYSTEM, call)


def _quiz_response(validated):
    """Build the quiz prompt and return validated structured questions."""

    topic = validated["topic"]
    num_questions = validated["num_questions"]
    difficulty = validated["difficulty"]

    topic_info = process_topic_with_url(topic)
    content = topic_info["combined_content"]

    user_msg = (
        f'Generate exactly {num_questions} multiple-choice quiz questions about the following content '
        f"at {difficulty} difficulty level. Each question must have 4 options (A, B, C, D), "
        f"one correct answer, and a brief explanation.\n\nTOPIC/CONTENT:\n{content}"
    )

    def call(system, msg):
        parsed = query_groq_structured(system, msg, QuizResponse, max_tokens=1000)
        return parsed.model_dump()

    return _cached_json_response("quiz_", user_msg, QUIZ_SYSTEM, call)


def _flashcards_response(validated):
    """Build the flashcard prompt and return validated structured cards."""

    topic = validated["topic"]
    num_cards = validated["num_cards"]

    topic_info = process_topic_with_url(topic)
    content = topic_info["combined_content"]

    user_msg = (
        f'Create exactly {num_cards} study flashcards for the following content. '
        "Mix definitions, concepts, and application-type questions. "
        f"Each card should have a short hint to help with memorization.\n\nTOPIC/CONTENT:\n{content}"
    )

    def call(system, msg):
        parsed = query_groq_structured(
            system, msg, FlashcardsResponse, max_tokens=900
        )
        return parsed.model_dump()

    return _cached_json_response("flashcards_", user_msg, FLASHCARDS_SYSTEM, call)


def _chat_reply_response(message, history=None):
    """Chat reply (no session persistence) — used by GenerateView for type=chat.
    Accepts prior turns so the ALL page can hold a multi-turn conversation."""
    try:
        reply = chat_groq(CHAT_SYSTEM, history or [], message, max_tokens=600)
        return Response({"reply": reply}, status=status.HTTP_200_OK)
    except Exception as e:  # noqa: BLE001
        return Response(
            {"error": f"AI request failed: {e!s}"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


# ── Views ──────────────────────────────────────────────────────────────────────


def _auto_title(message: str) -> str:
    """Derive a short sidebar title from the first message of a session."""
    title = message.strip().splitlines()[0]
    return title[:47] + "…" if len(title) > 47 else title


class GenerateView(APIView):
    """POST /api/generate/ — Run any tool for a topic and persist the result.

    Body: {"topic": "...", "type": "explain|summarize|quiz|flashcards|chat"}.
    Optional per-tool params: level (explain), format (summarize),
    num_questions + difficulty (quiz), num_cards (flashcards), history (chat).
    The generation is stored in the Generation table (with its type) so the
    app is stateful: results can be listed and re-opened later. The response
    includes the tool's normal payload plus a `generation_id`.
    """

    def post(self, request):
        serializer = GenerateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated = serializer.validated_data
        topic = validated["topic"]
        gen_type = validated["type"]

        # Fan out to the same tool helpers used by the dedicated legacy views.
        if gen_type == "explain":
            response = _explain_response({"topic": topic, "level": validated["level"]})
        elif gen_type == "summarize":
            response = _summarize_response(
                {"notes": topic, "format": validated["format"]}
            )
        elif gen_type == "quiz":
            response = _quiz_response(
                {
                    "topic": topic,
                    "num_questions": validated["num_questions"],
                    "difficulty": validated["difficulty"],
                }
            )
        elif gen_type == "flashcards":
            response = _flashcards_response(
                {"topic": topic, "num_cards": validated["num_cards"]}
            )
        else:  # chat — treat the topic as the message, keep recent turns
            response = _chat_reply_response(topic, validated.get("history", [])[-6:])

        if response.status_code == status.HTTP_200_OK:
            # Save the exact payload returned to the user so history hydration
            # never needs to regenerate AI content.
            generation = Generation.objects.create(
                user=request.user, type=gen_type, topic=topic, result=response.data
            )
            response.data = {**response.data, "generation_id": generation.id}
        return response


class GenerationListView(APIView):
    """GET /api/generations/ — the user's persisted generations, newest first.

    Optional `?type=` filter (explain, summarize, quiz, flashcards, chat).
    """

    def get(self, request):
        generations = Generation.objects.filter(user=request.user)
        gen_type = request.query_params.get("type")
        if gen_type:
            # Dedicated tool pages request only their own saved generations.
            generations = generations.filter(type=gen_type)
        return Response(GenerationModelSerializer(generations[:50], many=True).data)


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
            # Persisted sessions use server-side history as the source of truth.
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
                    # Send valid SSE frames that the React reader can parse one
                    # at a time as the model streams.
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


# ── Aggregated unified endpoint ──────────────────────────────────────────────
# All API operations flow through a single POST /unified/ that dispatches by
# an "action" field in the JSON body.  Old view classes remain for backward-
# compatible imports (tests reference them directly).


class UnifiedAPIView(APIView):
    """POST /unified/ — single aggregated entry point for every API operation.

    Request body: ``{"action": "<name>", ...other_fields}``
    Response  : ``{"ok": true/false, "data": ..., "error": ...}``

    Public actions (no JWT needed): register, login, refresh, health
    Authenticated actions: generate, generations_list, sessions_list,
    session_create, sessions_detail, session_rename, session_delete,
    unregister, chat_stream
    """

    permission_classes = (AllowAny,)

    def post(self, request):
        action = request.data.get("action")
        if not action or action not in ACTION_MAP:
            return Response(
                {"ok": False, "error": f"Unknown action: {action}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Enforce auth for non-public actions
        if action not in PUBLIC_ACTIONS and (not request.user or not request.user.is_authenticated):
            return Response(
                {"ok": False, "error": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        handler = ACTION_MAP[action]
        try:
            # Handlers own their response shape so streaming actions can return
            # StreamingHttpResponse while JSON actions return normal Response.
            result = handler(request.data, request)
            return result
        except Exception as exc:  # noqa: BLE001
            return Response(
                {"ok": False, "error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
