import json
import logging

from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .dispatchers import (
    _action_generation_delete,
    _action_rag_delete,
    _action_rag_document_status,
    _action_rag_list,
    _action_rag_query,
    _action_usage_stats,
    enforce_daily_token_limit,
)
from .generation import (
    _chat_reply_response,
    _explain_response,
    _flashcards_response,
    _ground_documents,
    _grounded_chat_system,
    _quiz_response,
    _summarize_response,
)

# pyrefly: ignore [missing-import]
from .langchain_client import (
    estimate_cost_usd,
    reset_last_usage,
    stream_chat_groq,
    take_last_usage,
)

# pyrefly: ignore [missing-import]
from .models import ChatMessage, ChatSession, Generation, UsageLog

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
from .throttles import AuthRateThrottle

logger = logging.getLogger(__name__)

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
    Optional `document_ids` grounds any tool in the caller's uploaded study
    documents: retrieved excerpts join the prompt and the response carries the
    matching `sources`. With the field absent the call behaves as before.
    The generation is stored in the Generation table (with its type) so the
    app is stateful: results can be listed and re-opened later. The response
    includes the tool's normal payload plus a `generation_id`.
    """

    throttle_scope = "generate"

    def post(self, request):
        serializer = GenerateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated = serializer.validated_data
        topic = validated["topic"]
        gen_type = validated["type"]

        # Refuse before any model call once the day's token budget is spent.
        limited = enforce_daily_token_limit(request.user)
        if limited is not None:
            return limited

        # A cache hit never calls the model, and worker threads reuse the same
        # context, so drop any counts left over from an earlier request before
        # dispatching. Only the calls made below can repopulate it.
        reset_last_usage()

        # Retrieval happens once here, against the student's own text, so every
        # tool grounds itself identically and none has to know about documents.
        docs = None
        if validated["document_ids"]:
            docs = _ground_documents(request.user, validated["document_ids"], topic)
            if isinstance(docs, Response):
                return docs

        # Fan out to the same tool helpers used by the dedicated legacy views.
        if gen_type == "explain":
            response = _explain_response(
                {"topic": topic, "level": validated["level"], "docs": docs}
            )
        elif gen_type == "summarize":
            response = _summarize_response(
                {"notes": topic, "format": validated["format"], "docs": docs}
            )
        elif gen_type == "quiz":
            response = _quiz_response(
                {
                    "topic": topic,
                    "num_questions": validated["num_questions"],
                    "difficulty": validated["difficulty"],
                    "docs": docs,
                }
            )
        elif gen_type == "flashcards":
            response = _flashcards_response(
                {"topic": topic, "num_cards": validated["num_cards"], "docs": docs}
            )
        else:  # chat — treat the topic as the message, keep recent turns
            response = _chat_reply_response(
                topic, validated.get("history", [])[-6:], docs
            )

        if response.status_code == status.HTTP_200_OK:
            # Save the exact payload returned to the user so history hydration
            # never needs to regenerate AI content. Token counts are read here
            # because the ContextVar is cleared on every read.
            usage = take_last_usage()
            generation = Generation.objects.create(
                user=request.user,
                type=gen_type,
                topic=topic,
                result=response.data,
                input_tokens=usage["input_tokens"],
                output_tokens=usage["output_tokens"],
                cost=estimate_cost_usd(usage["input_tokens"], usage["output_tokens"]),
            )
            if isinstance(response.data, dict):
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
    Optional `document_ids` grounds each turn in the caller's ready documents,
    and the closing frame carries the `sources` that answered it.
    """

    throttle_scope = "chat"

    def post(self, request):
        serializer = ChatSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        message = serializer.validated_data["message"]
        session_id = serializer.validated_data.get("session_id")

        # Same daily budget gate as the tools; refuse before opening the stream.
        limited = enforce_daily_token_limit(request.user)
        if limited is not None:
            return limited

        docs = None
        if serializer.validated_data.get("document_ids"):
            docs = _ground_documents(
                request.user, serializer.validated_data["document_ids"], message
            )
            # A grounding failure must not stream an ungrounded reply.
            if isinstance(docs, Response):
                return docs

        session = None
        if session_id is not None:
            # Persisted sessions use server-side history as the source of truth.
            session = get_object_or_404(ChatSession, id=session_id, user=request.user)
            history = [
                {"role": m.role, "content": m.content} for m in session.messages.all()
            ][-6:]
        else:
            history = serializer.validated_data.get("history", [])[-6:]

        system = _grounded_chat_system(docs)
        sources = docs["sources"] if docs else []

        def event_generator():
            # Usage accumulates per context; start this turn from zero.
            reset_last_usage()
            full_reply_parts: list[str] = []
            turn_recorded = False

            def record_turn() -> None:
                """Meter the turn and persist it, however the stream ended."""
                nonlocal turn_recorded
                turn_recorded = True
                # Streamed chat reached the model, so it must count toward the
                # daily budget. UsageLog is the meter for everything that is not
                # a persisted Generation.
                usage = take_last_usage()
                if usage["input_tokens"] or usage["output_tokens"]:
                    UsageLog.objects.create(
                        user=request.user,
                        input_tokens=usage["input_tokens"],
                        output_tokens=usage["output_tokens"],
                        estimated_cost=estimate_cost_usd(
                            usage["input_tokens"], usage["output_tokens"]
                        ),
                    )

                if session is not None:
                    is_first_turn = not session.messages.exists()
                    ChatMessage.objects.create(session=session, role="user", content=message)
                    full_reply = "".join(full_reply_parts)
                    if full_reply:
                        ChatMessage.objects.create(
                            session=session, role="assistant", content=full_reply
                        )
                    if is_first_turn:
                        session.title = _auto_title(message)
                    session.save()

            try:
                for chunk in stream_chat_groq(system, history, message, max_tokens=600):
                    # Send valid SSE frames that the React reader can parse one
                    # at a time as the model streams.
                    full_reply_parts.append(str(chunk))
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n".encode()

                record_turn()
                yield f"data: {json.dumps({'done': True, 'session_id': session.id if session else None, 'sources': sources})}\n\n".encode()
            except Exception:
                logger.exception("Chat stream failed for user=%s", request.user.id)
                yield f"data: {json.dumps({'error': 'The AI request failed. Please try again.'})}\n\n".encode()
            finally:
                # A reader that hangs up makes WSGI throw GeneratorExit at the
                # yield above, which skips both handlers; without this the tokens
                # already spent and the partial reply would go unrecorded, and the
                # daily budget would be bypassable by closing the tab.
                if not turn_recorded:
                    try:
                        record_turn()
                    except Exception:
                        logger.exception(
                            "Chat turn could not be recorded for user=%s", request.user.id
                        )

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
    throttle_classes = (AuthRateThrottle,)

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


class MeView(APIView):
    """GET /api/auth/me/ — the signed-in user's identity.

    Access tokens minted before the `username` claim existed carry only
    `user_id`, so the UI calls this once to recover the real handle instead of
    falling back to a generic label; no re-login is needed to fix an in-flight
    session.
    """

    def get(self, request):
        return Response({"id": request.user.id, "username": request.user.username})


class GenerationDetailView(APIView):
    """DELETE /api/generations/<id>/ for a single saved generation."""

    def delete(self, request, pk):
        return _action_generation_delete({"generation_id": pk}, request)


class UsageStatsView(APIView):
    """GET /api/usage/ for the authenticated user's generation totals."""

    def get(self, request):
        return _action_usage_stats({}, request)


class ChatSuggestionsView(APIView):
    """POST /api/sessions/<id>/suggestions/ for follow-up prompts."""

    throttle_scope = "chat"

    def post(self, request, pk):
        from .dispatchers import _action_chat_suggestions

        return _action_chat_suggestions({"session_id": pk}, request)


class RagDocumentsView(APIView):
    """GET /api/rag/documents/ lists the caller's uploaded documents."""

    def get(self, request):
        return _action_rag_list({}, request)


class RagDocumentDetailView(APIView):
    """GET/DELETE /api/rag/documents/<id>/ for one uploaded document."""

    def get(self, request, pk):
        return _action_rag_document_status({"document_id": pk}, request)

    def delete(self, request, pk):
        return _action_rag_delete({"document_id": pk}, request)


class RagQueryView(APIView):
    """POST /api/rag/query/ answers a question from uploaded documents."""

    throttle_scope = "rag"

    def post(self, request):
        return _action_rag_query(request.data, request)


class RagUploadView(APIView):
    """POST /api/rag/upload/ — multipart file upload for the RAG pipeline.

    Accepts multipart/form-data with:
      - file  (required): the document to index
      - title (optional): display name; defaults to the filename

    Returns the created Document record immediately while ingestion runs in the
    background. Poll GET /api/rag/documents/<id>/ to
    check when status becomes 'ready' or 'error'.
    """

    # Shares the expensive `rag` throttle bucket with rag_query.
    throttle_scope = "rag"

    def post(self, request):
        from .dispatchers import _action_rag_upload

        # Merge form fields into a data dict the dispatcher can read.
        data = {k: v for k, v in request.data.items() if k != "file"}
        return _action_rag_upload(data, request)
