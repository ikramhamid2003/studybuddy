# Lazy/safe import of LangChain — network calls during module init can block
import json

from django.contrib.auth.models import User
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)

from .content_fetcher import process_topic_with_url
from .models import ChatMessage, ChatSession, Generation
from .schemas import FlashcardsResponse, QuizResponse

try:
    from .langchain_client import (
        chat_groq,
        query_groq_json,
        query_groq_structured,
        stream_chat_groq,
    )

    _HAS_LANGCHAIN = True
except Exception:  # noqa: BLE001
    # Server starts even if LangChain is broken/unreachable
    chat_groq = query_groq_json = stream_chat_groq = query_groq_structured = None
    _HAS_LANGCHAIN = False


# Actions that do NOT require authentication
PUBLIC_ACTIONS = frozenset(["register", "login", "refresh", "health"])

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


CHAT_CONTEXT_TURNS = 20
GLOBAL_CHAT_CONTEXT_TURNS = 12
GLOBAL_GENERATION_CONTEXT_ITEMS = 6


def _error(msg, code=status.HTTP_400_BAD_REQUEST):
    """Return the unified API error envelope used by the frontend client."""

    return Response({"ok": False, "error": msg}, status=code)


def _ok(data=None, status=status.HTTP_200_OK):
    """Return the unified API success envelope used by the frontend client."""

    return Response({"ok": True, "data": {} if data is None else data}, status=status)


def _unwrap(obj):
    """Convert DRF dict-like to plain dict (nested)."""
    if isinstance(obj, dict):
        return {k: _unwrap(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_unwrap(i) for i in obj]
    return obj


def _clip_text(value, limit=700):
    """Trim saved context so prompts stay within a predictable token budget."""

    text = str(value or "").strip()
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "..."


def _saved_chat_session_context(user, exclude_session=None, limit=GLOBAL_CHAT_CONTEXT_TURNS):
    """Build a compact, read-only memory block from the user's other chats."""
    queryset = ChatMessage.objects.filter(session__user=user).select_related("session")
    if exclude_session is not None:
        queryset = queryset.exclude(session=exclude_session)

    messages = list(queryset.order_by("-created_at")[:limit])
    if not messages:
        return []

    lines = []
    for msg in reversed(messages):
        speaker = "Student" if msg.role == "user" else "Assistant"
        lines.append(f"[{msg.session.title}] {speaker}: {_clip_text(msg.content, 500)}")

    return [
        {
            "role": "user",
            "content": (
                "Saved context from this student's previous chat sessions. "
                "Use it only when it helps answer the current question; do not mention "
                "this context unless the student asks about prior conversations.\n"
                + "\n".join(lines)
            ),
        }
    ]


def _saved_generation_chat_context(user, limit=GLOBAL_GENERATION_CONTEXT_ITEMS):
    """Build a compact memory block from chat turns saved by the ALL page."""
    generations = list(
        Generation.objects.filter(user=user, type="chat").order_by("-created_at")[:limit]
    )
    if not generations:
        return []

    lines = []
    for generation in reversed(generations):
        reply = generation.result.get("reply", "") if isinstance(generation.result, dict) else ""
        lines.append(f"Student: {_clip_text(generation.topic, 500)}")
        if reply:
            lines.append(f"Assistant: {_clip_text(reply, 500)}")

    return [
        {
            "role": "user",
            "content": (
                "Saved context from this student's previous ALL-page chat messages. "
                "Use it only when relevant to the current question.\n" + "\n".join(lines)
            ),
        }
    ]


# ── Actions (public – no auth) ───────────────────────────────────────────────


def _action_register(data, request=None):
    """Create a Django user from the public unified endpoint."""

    username = data.get("username", "").strip()
    password = data.get("password", "")
    email = data.get("email", "").strip()
    if not username or not password:
        return _error("username and password required")
    try:
        user = User.objects.create_user(username=username, email=email, password=password)
        return _ok({"message": "Registered", "user": {"username": user.username, "email": user.email}})
    except Exception as e:  # noqa: BLE001
        msg = str(e) or "Registration failed"
        return _error(msg, code=status.HTTP_400_BAD_REQUEST)


def _action_login(data, request=None):
    """Issue JWT access/refresh tokens using SimpleJWT validation."""

    serializer = TokenObtainPairSerializer(data={"username": data.get("username", ""), "password": data.get("password", "")})
    try:
        serializer.is_valid(raise_exception=True)
        return _ok(_unwrap(serializer.validated_data))
    except Exception as e:  # noqa: BLE001
        return _error(str(e))


def _action_refresh(data, request=None):
    """Refresh a JWT access token without requiring the old access token."""

    refresh_token = data.get("refresh")
    if not refresh_token:
        return _error("refresh token required")
    serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
    try:
        serializer.is_valid(raise_exception=True)
        return _ok(_unwrap(serializer.validated_data))
    except Exception as e:  # noqa: BLE001
        return _error(str(e))


# ── Actions (authenticated – JWT required) ──────────────────────────────────


def _action_generate(data, request):
    """Route one saved AI generation to the correct prompt/client handler."""

    topic = data.get("topic", "").strip()
    gen_type = data.get("type")
    if not topic or not gen_type:
        return _error("topic and type required")

    # Process topic - fetch URL content if applicable
    topic_info = process_topic_with_url(topic)
    content = topic_info["combined_content"]
    has_url = topic_info["has_url"]
    url_title = topic_info["fetched_content"]["title"] if topic_info["fetched_content"] else ""

    chat_history = []
    if gen_type == "chat":
        chat_history = (
            _saved_chat_session_context(request.user)
            + _saved_generation_chat_context(request.user)
            + data.get("history", [])[-CHAT_CONTEXT_TURNS:]
        )

    # Build user message with URL context if available
    def build_user_msg(base_msg):
        if has_url and topic_info["fetched_content"] and topic_info["fetched_content"]["success"]:
            return f"{base_msg}\n\n--- Web Content from {topic_info['original_topic']} ---\n{topic_info['fetched_content']['content']}"
        return base_msg

    handlers = {
        "explain": lambda: query_groq_json(EXPLAIN_SYSTEM, build_user_msg(f'Explain "{topic}" at {data.get("level","beginner")} level.'), max_tokens=700),
        "summarize": lambda: query_groq_json(SUMMARIZE_SYSTEM, build_user_msg(f'Summarize the following content:\n{content}'), max_tokens=800),
        "quiz": lambda: query_groq_structured(QUIZ_SYSTEM, build_user_msg(f'Generate {data.get("num_questions",5)} quiz Qs about "{topic}" ({data.get("difficulty","medium")}).'), QuizResponse, max_tokens=1000).model_dump(),
        "flashcards": lambda: query_groq_structured(FLASHCARDS_SYSTEM, build_user_msg(f'Create {data.get("num_cards",8)} flashcards about "{topic}".'), FlashcardsResponse, max_tokens=900).model_dump(),
        "chat": lambda: {"reply": chat_groq(CHAT_SYSTEM, chat_history, build_user_msg(topic), max_tokens=600)},
    }
    handler = handlers.get(gen_type)
    if not handler:
        return _error(f"unknown type: {gen_type}")
    try:
        result = handler()
    except Exception as e:  # noqa: BLE001
        return _error(f"AI request failed: {e}", code=status.HTTP_503_SERVICE_UNAVAILABLE)

    generation = Generation.objects.create(user=request.user, type=gen_type, topic=topic, result=result)
    result["generation_id"] = generation.id
    if has_url:
        result["source_url"] = topic_info["original_topic"]
        if url_title:
            result["source_title"] = url_title
    return _ok(result)


def _action_generations_list(data, request):
    """List the latest saved generations, optionally filtered by tool type."""

    qset = Generation.objects.filter(user=request.user)
    gen_type = data.get("query_type")
    if gen_type:
        qset = qset.filter(type=gen_type)
    qs = list(qset[:50])
    return _ok([{"id": g.id, "type": g.type, "topic": g.topic, "result": g.result, "created_at": g.created_at.isoformat()} for g in qs])


def _action_sessions_list(data, request):
    """List chat sessions for the authenticated sidebar."""

    sessions = ChatSession.objects.filter(user=request.user)
    return _ok([{"id": s.id, "title": s.title, "created_at": s.created_at.isoformat(), "updated_at": s.updated_at.isoformat()} for s in sessions])


def _action_session_create(data, request):
    """Create an empty chat session before the first streamed message."""

    session = ChatSession.objects.create(user=request.user)
    return _ok({"id": session.id, "title": session.title, "created_at": session.created_at.isoformat(), "updated_at": session.updated_at.isoformat()}, status=status.HTTP_201_CREATED)


def _action_sessions_detail(data, request):
    """Return a single chat transcript with its persisted messages."""

    session_id = data.get("session_id")
    if not session_id:
        return _error("session_id required")
    session = get_object_or_404(ChatSession, id=session_id, user=request.user)
    messages = [{"role": m.role, "content": m.content, "id": m.id, "created_at": m.created_at.isoformat()} for m in session.messages.all()]
    return _ok({
        "id": session.id,
        "title": session.title,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
        "messages": messages,
    })


def _action_session_rename(data, request):
    """Rename a chat session owned by the current user."""

    session_id = data.get("session_id")
    title = data.get("title", "").strip()
    if not session_id or not title:
        return _error("session_id and title required")
    session = get_object_or_404(ChatSession, id=session_id, user=request.user)
    session.title = title
    session.save()
    return _ok({"id": session.id, "title": session.title, "created_at": session.created_at.isoformat(), "updated_at": session.updated_at.isoformat()})


def _action_session_delete(data, request):
    """Delete one chat session and its cascade-owned messages."""

    session_id = data.get("session_id")
    if not session_id:
        return _error("session_id required")
    session = get_object_or_404(ChatSession, id=session_id, user=request.user)
    session.delete()
    return _ok({})


def _action_unregister(data, request):
    """Delete the authenticated user account."""

    try:
        request.user.delete()
    except Exception as e:  # noqa: BLE001
        return _error(str(e))
    return _ok({"message": "Account deleted"})


# ── Special: streaming (returns SSE) ─────────────────────────────────────────

def _action_chat_stream(data, request):
    """Stream assistant tokens as SSE and persist the completed chat turn."""

    message = data.get("message", "")
    history = data.get("history", [])[-CHAT_CONTEXT_TURNS:]
    session_id = data.get("session_id")

    # Process message for URLs
    msg_info = process_topic_with_url(message)
    processed_message = msg_info["combined_content"]

    full_reply_parts = []
    session = None
    if session_id:
        session = get_object_or_404(ChatSession, id=session_id, user=request.user)
        session_history = [
            {"role": m.role, "content": m.content}
            for m in session.messages.all()
        ][-CHAT_CONTEXT_TURNS:]
        history = _saved_chat_session_context(request.user, exclude_session=session) + session_history
    else:
        history = _saved_chat_session_context(request.user) + history

    def event_generator():
        nonlocal full_reply_parts, session
        try:
            # Forward each model chunk immediately while saving pieces for the
            # final persisted assistant message.
            for chunk in stream_chat_groq(CHAT_SYSTEM, history, processed_message, max_tokens=600):
                full_reply_parts.append(chunk)
                yield f"data: {{\"chunk\": {json.dumps(chunk)}}}\n\n".encode()

            if session is not None:
                is_first_turn = not session.messages.exists()
                full_reply = "".join(full_reply_parts)
                ChatMessage.objects.create(session=session, role="user", content=message)
                ChatMessage.objects.create(session=session, role="assistant", content=full_reply)
                if is_first_turn:
                    session.title = message.strip().splitlines()[0][:47] + ("…" if len(message.strip().splitlines()[0]) > 47 else "")
                session.save()

            yield f'data: {{"done": true, "session_id": {json.dumps(session.id if session else None)}}}\n\n'.encode()
        except Exception as e:  # noqa: BLE001
            yield f'data: {{"error": {json.dumps(str(e))}}}\n\n'.encode()

    resp = StreamingHttpResponse(event_generator(), content_type="text/event-stream")
    resp["X-Accel-Buffering"] = "no"
    resp["Cache-Control"] = "no-cache"
    return resp


ACTION_MAP = {
    # The frontend sends an action string to /unified/; this table is the only
    # place that string is coupled to backend behavior.
    "register": _action_register,
    "login": _action_login,
    "refresh": _action_refresh,
    "generate": _action_generate,
    "generations_list": _action_generations_list,
    "sessions_list": _action_sessions_list,
    "session_create": _action_session_create,
    "sessions_detail": _action_sessions_detail,
    "session_rename": _action_session_rename,
    "session_delete": _action_session_delete,
    "unregister": _action_unregister,
    "chat_stream": _action_chat_stream,
    "health": lambda _data, _request=None: _ok({"status": "ok"}),
}
