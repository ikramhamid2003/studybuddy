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
from .dispatchers import (
    _action_generation_delete,
    _action_rag_delete,
    _action_rag_document_status,
    _action_rag_list,
    _action_rag_query,
    _action_usage_stats,
    enforce_daily_token_limit,
    ready_document_ids,
)

# pyrefly: ignore [missing-import]
from .langchain_client import (
    chat_groq,
    estimate_cost_usd,
    query_groq_json,
    query_groq_structured,
    reset_last_usage,
    stream_chat_groq,
    take_last_usage,
)

# Lazy/safe import of the RAG pipeline — the server must start even when its
# heavy dependencies are missing (same guard dispatchers.py uses).
try:
    from .rag_pipeline import _build_rag_context, retrieve_chunks

    _HAS_RAG = True
except Exception:  # noqa: BLE001
    _HAS_RAG = False

# pyrefly: ignore [missing-import]
from .models import ChatMessage, ChatSession, Document, Generation, UsageLog

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


# Appended to any tool prompt that is grounded in uploaded documents. The
# instruction to abstain is what keeps a grounded generation from silently
# falling back to model knowledge when the excerpts miss the point.
DOCS_PREAMBLE = (
    "Answer using the SOURCE DOCUMENTS block below. Quote or paraphrase it and "
    "name the document each claim came from. If it does not cover something you "
    "were asked for, say that plainly instead of inventing it."
)

# Retrieval runs on the student's own text, not on the fully expanded prompt
# (which can carry whole fetched web pages).
_MAX_GROUNDING_QUERY_CHARS = 2000

# A deliberate selection is small enough to read whole, so tools consume the
# full document text when it fits this budget and fall back to top-k retrieval
# only for oversized selections.
_FULL_DOC_CHAR_BUDGET = 24000


def _whole_document_context(doc_ids):
    """Full text of the selected documents as a grounding block, or None.

    None means "too big — use retrieval instead". A document with no extracted
    text also forces the fallback so a partial selection never silently drops
    one of the chosen documents.
    """

    by_id = {d.id: d for d in Document.objects.filter(id__in=doc_ids)}
    docs = [by_id[i] for i in doc_ids if i in by_id]
    texts = [(d, d.raw_text.strip()) for d in docs]
    if not texts or any(not t for _, t in texts):
        return None
    if sum(len(t) for _, t in texts) > _FULL_DOC_CHAR_BUDGET:
        return None
    context = "\n\n---\n\n".join(f"[{d.title}]\n{t}" for d, t in texts)
    sources = [
        {
            "document_id": d.id,
            "document_title": d.title,
            "page_number": None,
            "score": None,
            "text_preview": t[:200] + ("..." if len(t) > 200 else ""),
        }
        for d, t in texts
    ]
    return {
        "context": context,
        "sources": sources,
        "document_titles": [d.title for d, _ in texts],
    }


def _ground_documents(user, document_ids, query):
    """Ground a tool call in its selected documents, or return an error Response.

    Whole-document first: an explicit selection whose text fits the budget is
    handed to the model in full. Oversized or partially unextracted selections
    fall back to the Ask-My-Docs style top-k retrieval.
    """

    if not _HAS_RAG:
        return Response(
            {"error": "Document search is unavailable (RAG dependencies missing)."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    parsed = []
    for d in document_ids:
        try:
            parsed.append(int(d))
        except (ValueError, TypeError):
            continue
    doc_ids = ready_document_ids(user, parsed)
    if not doc_ids:
        return Response(
            {"error": "None of the selected documents are ready for search."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    whole = _whole_document_context(doc_ids)
    if whole is not None:
        return whole

    try:
        chunks = retrieve_chunks(doc_ids, str(query)[:_MAX_GROUNDING_QUERY_CHARS])
    except Exception as e:  # noqa: BLE001
        return Response(
            {"error": f"Document search failed: {e!s}"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    if not chunks:
        return Response(
            {"error": "No relevant content found in the selected documents."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    sources = [
        {
            "document_id": c["document_id"],
            "document_title": c["document_title"],
            "page_number": c.get("page_number"),
            "score": c.get("score"),
            "text_preview": c["text"][:200] + ("..." if len(c["text"]) > 200 else ""),
        }
        for c in chunks
    ]
    titles = list(dict.fromkeys(c["document_title"] for c in chunks))
    return {
        "context": _build_rag_context(chunks),
        "sources": sources,
        "document_titles": titles,
    }


def _with_docs(user_msg, docs):
    """Append the retrieved document block to a tool prompt."""

    if not docs:
        return user_msg
    return f"{user_msg}\n\n{DOCS_PREAMBLE}\n\nSOURCE DOCUMENTS:\n{docs['context']}"


def _grounded_chat_system(docs):
    """Chat's system prompt with the retrieved excerpts bolted on."""

    if not docs:
        return CHAT_SYSTEM
    return f"{CHAT_SYSTEM}\n\n{DOCS_PREAMBLE}\n\nSOURCE DOCUMENTS:\n{docs['context']}"


def _llm_call_with_retry(llm_call, system, user_msg):
    """Run the model once, and once more if its output fails schema parsing.

    Occasional samples violate the schema (a missing field, JSON cut at the
    token budget); a regeneration at the same temperature clears most of them,
    so only a second failure surfaces as a 502. The failed attempt's token
    usage is not recorded — take_last_usage reads the final call only.
    """

    try:
        return llm_call(system, user_msg)
    except ValueError:
        return llm_call(system, user_msg)


def _cached_json_response(prefix, user_msg, system, llm_call, docs=None):
    """Cache-wrapped LLM call shared by all JSON-returning tools."""
    try:
        # The full prompt text is the cache key input so different options do
        # not accidentally share the same model response. Grounded calls carry
        # their retrieved excerpts inside user_msg, so a different document set
        # or a re-indexed document hashes to a different key automatically.
        cache_key = prefix + hashlib.md5(user_msg.encode()).hexdigest()
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data, status=status.HTTP_200_OK)

        data = _llm_call_with_retry(llm_call, system, user_msg)
        if docs and isinstance(data, dict):
            # Sources are cached with the answer so reopening from history can
            # still show which documents produced it.
            data = {**data, "sources": docs["sources"], "grounded_in": docs["document_titles"]}
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
    docs = validated.get("docs")

    user_msg = (
        f'Explain the concept of "{topic}" at a {level} level. '
        "Be engaging, clear, and use simple language where possible."
    )

    def call(system, msg):
        return query_groq_json(system, msg, max_tokens=1000)

    return _cached_json_response(
        "explain_", _with_docs(user_msg, docs), EXPLAIN_SYSTEM, call, docs
    )


def _summarize_response(validated):
    """Build the summarizer prompt and return a cached JSON tool response."""

    notes = validated["notes"]
    fmt = validated["format"]
    docs = validated.get("docs")

    user_msg = (
        f"Summarize the following study notes in {fmt} format. "
        "Extract the key concepts, define important terms, and provide study tips.\n\n"
        f"NOTES:\n{notes}"
    )

    def call(system, msg):
        return query_groq_json(system, msg, max_tokens=1200)

    return _cached_json_response(
        "summarize_", _with_docs(user_msg, docs), SUMMARIZE_SYSTEM, call, docs
    )


def _quiz_response(validated):
    """Build the quiz prompt and return validated structured questions."""

    topic = validated["topic"]
    num_questions = validated["num_questions"]
    difficulty = validated["difficulty"]
    docs = validated.get("docs")

    topic_info = process_topic_with_url(topic)
    content = topic_info["combined_content"]

    user_msg = (
        f'Generate exactly {num_questions} multiple-choice quiz questions about the following content '
        f"at {difficulty} difficulty level. Each question must have 4 options (A, B, C, D), "
        f"one correct answer, and a brief explanation.\n\nTOPIC/CONTENT:\n{content}"
    )

    def call(system, msg):
        # Grounded answers quote the source and run long; a budget that only
        # fits the ungrounded output truncates the JSON mid-list, which the
        # parser reports as a 502. These cover the serializer's max counts
        # with room for per-item source citations.
        parsed = query_groq_structured(system, msg, QuizResponse, max_tokens=2400)
        return parsed.model_dump()

    return _cached_json_response(
        "quiz_", _with_docs(user_msg, docs), QUIZ_SYSTEM, call, docs
    )


def _flashcards_response(validated):
    """Build the flashcard prompt and return validated structured cards."""

    topic = validated["topic"]
    num_cards = validated["num_cards"]
    docs = validated.get("docs")

    topic_info = process_topic_with_url(topic)
    content = topic_info["combined_content"]

    user_msg = (
        f'Create exactly {num_cards} study flashcards for the following content. '
        "Mix definitions, concepts, and application-type questions. "
        f"Each card should have a short hint to help with memorization.\n\nTOPIC/CONTENT:\n{content}"
    )

    def call(system, msg):
        parsed = query_groq_structured(
            system, msg, FlashcardsResponse, max_tokens=3000
        )
        return parsed.model_dump()

    return _cached_json_response(
        "flashcards_", _with_docs(user_msg, docs), FLASHCARDS_SYSTEM, call, docs
    )


def _chat_reply_response(message, history=None, docs=None):
    """Chat reply (no session persistence) — used by GenerateView for type=chat.
    Accepts prior turns so the ALL page can hold a multi-turn conversation."""
    system = CHAT_SYSTEM
    extra: dict = {}
    if docs:
        # Chat is uncached, so the retrieved block only has to reach the model.
        system = _grounded_chat_system(docs)
        extra = {"sources": docs["sources"], "grounded_in": docs["document_titles"]}
    try:
        reply = chat_groq(system, history or [], message, max_tokens=600)
        return Response({"reply": reply, **extra}, status=status.HTTP_200_OK)
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
            full_reply_parts: list[str] = []
            try:
                for chunk in stream_chat_groq(system, history, message, max_tokens=600):
                    # Send valid SSE frames that the React reader can parse one
                    # at a time as the model streams.
                    full_reply_parts.append(str(chunk))
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n".encode()

                # Streamed chat reached the model, so it must count toward the
                # daily budget. UsageLog is the meter for everything that is not
                # a persisted Generation; read it while the context still holds
                # the final chunk's token counts.
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
                    full_reply = "".join(full_reply_parts)
                    ChatMessage.objects.create(session=session, role="user", content=message)
                    ChatMessage.objects.create(
                        session=session, role="assistant", content=full_reply
                    )
                    if is_first_turn:
                        session.title = _auto_title(message)
                    session.save()

                yield f"data: {json.dumps({'done': True, 'session_id': session.id if session else None, 'sources': sources})}\n\n".encode()
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
