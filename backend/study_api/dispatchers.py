# Lazy/safe import of LangChain — network calls during module init can block
import threading
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth.models import User
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

from .models import (
    ChatSession,
    Document,
    Generation,
    UsageLog,
)

try:
    from .langchain_client import query_groq_json
except Exception:  # noqa: BLE001
    # Server starts even if LangChain is broken/unreachable
    def query_groq_json(*_args: Any, **_kwargs: Any) -> Any:
        raise RuntimeError("LangChain is unavailable. Install the configured backend dependencies.")

try:
    from .rag_pipeline import ingest_document, rag_answer, retrieve_chunks

    _HAS_RAG = True
except Exception:  # noqa: BLE001
    def _rag_unavailable(*_args: Any, **_kwargs: Any) -> Any:
        raise RuntimeError("The RAG pipeline is unavailable. Install the configured backend dependencies.")

    ingest_document = rag_answer = retrieve_chunks = _rag_unavailable
    _HAS_RAG = False


CHAT_SUGGESTIONS_SYSTEM = (
    "You suggest short, concrete follow-up questions a student might ask next. "
    "Given the conversation, produce EXACTLY 3 follow-up questions that: "
    "build on the current topic, vary in depth (one clarifying, one deeper, one tangential), "
    "and are specific — never generic placeholders like 'tell me more'. "
    "Each question must be one line, at most 90 characters, no leading numbers or bullets. "
    "Always respond with ONLY a valid JSON object — no markdown, no extra text: "
    '{"suggestions": ["q1", "q2", "q3"]}'
)


def _error(msg: str, code: int = status.HTTP_400_BAD_REQUEST) -> Response:
    """Return the standard API error envelope used by the frontend client."""

    return Response({"ok": False, "error": msg}, status=code)


def _ok(data: Any = None, status: int = status.HTTP_200_OK) -> Response:
    """Return the standard API success envelope used by the frontend client."""

    return Response({"ok": True, "data": {} if data is None else data}, status=status)


def _clip_text(value: Any, limit: int = 700) -> str:
    """Trim saved context so prompts stay within a predictable token budget."""

    text = str(value or "").strip()
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "..."


def daily_token_limit() -> int:
    """Per-user token budget for the current day. <= 0 disables the cap."""

    return int(getattr(settings, "USER_TOKEN_LIMIT", 0) or 0)


def _tokens_in_range(queryset) -> int:
    agg = queryset.aggregate(i=Sum("input_tokens"), o=Sum("output_tokens"))
    return (agg["i"] or 0) + (agg["o"] or 0)


def tokens_used_today(user) -> int:
    """Input + output tokens this user has already spent in the current day.

    Sums persisted Generations and streamed-chat UsageLogs — together they are
    every call that reached the model, so neither tool type slips past the cap.
    """

    today = timezone.localdate()
    return _tokens_in_range(
        Generation.objects.filter(user=user, created_at__date=today)
    ) + _tokens_in_range(UsageLog.objects.filter(user=user, created_at__date=today))


def enforce_daily_token_limit(user) -> Response | None:
    """Return a 429 response once the day's budget is spent, else None.

    Checked before any model call, so an over-budget request never spends
    provider tokens. A user can overshoot by at most one call's worth, which is
    unavoidable without pricing the request up front.
    """

    limit = daily_token_limit()
    if limit <= 0 or tokens_used_today(user) < limit:
        return None
    return Response(
        {
            "error": (
                f"You've used all {limit:,} tokens for today. "
                "Your daily budget resets at midnight."
            )
        },
        status=status.HTTP_429_TOO_MANY_REQUESTS,
    )


def _action_usage_stats(data: dict[str, Any], request: Any) -> Response:
    """Return cumulative token usage and estimated cost for the authenticated user."""
    generations = Generation.objects.filter(user=request.user)
    total_input = sum(g.input_tokens or 0 for g in generations)
    total_output = sum(g.output_tokens or 0 for g in generations)
    total_cost = sum(g.cost or 0 for g in generations)

    # Generation already records per-tool usage; UsageLog adds anything that was
    # tracked separately, so the two are summed rather than treated as exclusive.
    usage_logs = UsageLog.objects.filter(user=request.user)
    total_input += sum(ul.input_tokens or 0 for ul in usage_logs)
    total_output += sum(ul.output_tokens or 0 for ul in usage_logs)
    total_cost += sum(ul.estimated_cost or 0 for ul in usage_logs)

    limit = daily_token_limit()
    used_today = tokens_used_today(request.user)
    return _ok({
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
        "total_estimated_cost": round(total_cost, 4),
        "daily_token_limit": limit,
        "tokens_used_today": used_today,
        "tokens_remaining_today": max(0, limit - used_today) if limit > 0 else None,
    })


def _action_generation_delete(data: dict[str, Any], request: Any) -> Response:
    """Delete one saved generation owned by the current user."""

    generation_id = data.get("generation_id")
    if not generation_id:
        return _error("generation_id required")
    # Filtering by user keeps one account from deleting another account's
    # history, and returns a real 404 instead of a generic server error.
    generation = Generation.objects.filter(id=generation_id, user=request.user).first()
    if generation is None:
        return _error("Generation not found", code=status.HTTP_404_NOT_FOUND)
    generation.delete()
    return _ok({})


def _action_chat_suggestions(data: dict[str, Any], request: Any) -> Response:
    """Return 3 contextual follow-up question chips for the given session.

    Reads the session's most recent turns and asks the LLM for exactly three
    short, concrete follow-ups so the UI can offer the student a natural next
    step. Falls back to an empty list rather than an error so the chat keeps
    working if the model is briefly unavailable.
    """

    session_id = data.get("session_id")
    if not session_id:
        return _error("session_id required")

    session = get_object_or_404(ChatSession, id=session_id, user=request.user)
    turns = [m for m in session.messages.all()][-8:]
    if len(turns) < 2 or not any(m.role == "assistant" for m in turns):
        # No real exchange yet, so there is nothing sensible to follow up on.
        return _ok({"suggestions": []})

    transcript = "\n".join(
        f"{'Student' if m.role == 'user' else 'Assistant'}: {_clip_text(m.content, 500)}"
        for m in turns
    )
    user_msg = f"Conversation so far:\n{transcript}\n\nSuggest the next follow-up questions."

    try:
        parsed = query_groq_json(
            CHAT_SUGGESTIONS_SYSTEM, user_msg, max_tokens=120
        )
    except Exception:  # noqa: BLE001
        return _ok({"suggestions": []})

    raw = parsed.get("suggestions", []) if isinstance(parsed, dict) else []
    suggestions = [str(s).strip() for s in raw if str(s).strip()]
    # Drop duplicates, cap length, and keep the model output to the required 3.
    seen = set()
    unique = []
    for s in suggestions:
        key = s.lower()
        if key not in seen and len(s) <= 90:
            seen.add(key)
            unique.append(s[:90])
        if len(unique) == 3:
            break
    return _ok({"suggestions": unique})


# ── RAG actions ─────────────────────────────────────────────────────────────


RAG_MAX_UPLOAD_MB = 20  # fallback; settings value used when available


def _doc_dict(doc: Document) -> dict[str, Any]:
    """Serialize a Document model instance to a JSON-safe dict."""
    return {
        "id": doc.id,
        "title": doc.title,
        "filename": doc.filename,
        "file_size": doc.file_size,
        "page_count": doc.page_count,
        "chunk_count": doc.chunk_count,
        "status": doc.status,
        "error_message": doc.error_message,
        "created_at": doc.created_at.isoformat(),
        "updated_at": doc.updated_at.isoformat(),
    }


def _reap_stale_documents(user: User) -> None:
    """Fail documents whose ingestion died with the worker that ran it.

    Ingestion happens in a daemon thread and the uploaded bytes are never
    persisted, so a deploy or restart mid-ingest destroys the work with nothing
    to resume from. Without this the row stays 'processing' forever and the
    frontend — which polls while any document is pending or processing — never
    stops. Reaping lazily on read keeps it bounded to the requesting user and
    needs no scheduler. A thread that is merely slow will still finish and
    overwrite the status with 'ready'.
    """

    timeout = settings.RAG_INGEST_TIMEOUT_SECONDS
    now = timezone.now()
    Document.objects.filter(
        user=user,
        status__in=("pending", "processing"),
        updated_at__lt=now - timedelta(seconds=timeout),
    ).update(
        status="error",
        error_message=(
            "Processing was interrupted by a server restart. "
            "Please upload the file again."
        ),
        # auto_now does not apply to QuerySet.update(), so stamp it explicitly.
        updated_at=now,
    )


def _action_rag_upload(data: dict[str, Any], request: Any) -> Response:
    """Receive an uploaded file, create a Document record, and start ingestion.

    The file arrives via multipart/form-data in request.FILES['file'].
    Ingestion (extract → chunk → embed → store) runs in a background thread
    so the HTTP response is immediate and the UI can poll for status.
    """
    from django.conf import settings as dj_settings

    if not _HAS_RAG:
        return _error("RAG pipeline is not available (missing dependencies).")

    file_obj = request.FILES.get("file")
    if not file_obj:
        return _error("No file uploaded. Send a multipart request with a 'file' field.")

    if file_obj.size == 0:
        return _error("The uploaded file is empty.")

    max_mb = getattr(dj_settings, "RAG_MAX_UPLOAD_MB", RAG_MAX_UPLOAD_MB)
    if file_obj.size > max_mb * 1024 * 1024:
        return _error(f"File too large. Maximum upload size is {max_mb} MB.")

    allowed_ext = {".pdf", ".txt", ".md"}
    filename = (file_obj.name or "upload").strip()
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in allowed_ext:
        return _error("Unsupported file type. Upload a PDF, TXT, or MD file.")

    file_bytes = file_obj.read()
    raw_title = (data.get("title") or "").strip() or filename
    title = raw_title[:500]
    filename = filename[:500]

    doc = Document.objects.create(
        user=request.user,
        title=title,
        filename=filename,
        file_size=file_obj.size,
        status="pending",
    )

    # Kick off ingestion in a background thread to return immediately.
    def _run_ingest(doc_id: int, content: bytes) -> None:
        try:
            ingest_document(doc_id, content)
        except Exception:  # noqa: BLE001, S110 — ingest_document already updates doc.status to 'error'
            pass
        finally:
            # Clean up the thread-local database connection to avoid leaks
            from django.db import connection
            connection.close()

    thread = threading.Thread(target=_run_ingest, args=(doc.id, file_bytes), daemon=True)
    thread.start()

    return _ok(_doc_dict(doc), status=status.HTTP_201_CREATED)


def _action_rag_list(data: dict[str, Any], request: Any) -> Response:
    """List all documents uploaded by the authenticated user."""
    _reap_stale_documents(request.user)
    docs = Document.objects.filter(user=request.user).order_by("-created_at")
    return _ok([_doc_dict(d) for d in docs])


def _action_rag_document_status(data: dict[str, Any], request: Any) -> Response:
    """Return the current processing status of a single document."""
    raw_id = data.get("document_id")
    if raw_id is None:
        return _error("document_id required")
    try:
        doc_id = int(raw_id)
    except (ValueError, TypeError):
        return _error("Invalid document_id", code=status.HTTP_400_BAD_REQUEST)

    _reap_stale_documents(request.user)
    doc = Document.objects.filter(id=doc_id, user=request.user).first()
    if doc is None:
        return _error("Document not found", code=status.HTTP_404_NOT_FOUND)
    return _ok(_doc_dict(doc))


def _action_rag_delete(data: dict[str, Any], request: Any) -> Response:
    """Delete a document and all its chunks."""
    raw_id = data.get("document_id")
    if raw_id is None:
        return _error("document_id required")
    try:
        doc_id = int(raw_id)
    except (ValueError, TypeError):
        return _error("Invalid document_id", code=status.HTTP_400_BAD_REQUEST)

    doc = Document.objects.filter(id=doc_id, user=request.user).first()
    if doc is None:
        return _error("Document not found", code=status.HTTP_404_NOT_FOUND)
    doc.delete()  # cascades to DocumentChunk
    return _ok({})


def ready_document_ids(user: User, requested: list[int] | None = None) -> list[int]:
    """Ids of this user's searchable documents, optionally narrowed to *requested*.

    Only `ready` documents count: a pending or failed one has no usable chunks,
    and another user's id must never resolve, whichever endpoint asks.
    """

    owned = Document.objects.filter(user=user, status="ready")
    if requested is None:
        return list(owned.values_list("id", flat=True))
    allowed = set(owned.filter(id__in=requested).values_list("id", flat=True))
    return [d for d in requested if d in allowed]


def _action_rag_query(data: dict[str, Any], request: Any) -> Response:
    """Answer a question using RAG over the user's selected documents.

    Body fields:
      - question (str, required): the student's question
      - document_ids (list[int], optional): which docs to search;
        defaults to all 'ready' docs owned by the user
      - top_k (int, optional): number of chunks to retrieve (default: 5)
    """
    if not _HAS_RAG:
        return _error("RAG pipeline is not available (missing dependencies).")

    question = (data.get("question") or "").strip()
    if not question:
        return _error("question is required")

    raw_doc_ids = data.get("document_ids")
    if raw_doc_ids is not None:
        if not isinstance(raw_doc_ids, list):
            return _error("document_ids must be a list of document IDs.")
        parsed_ids = []
        for d in raw_doc_ids:
            try:
                parsed_ids.append(int(d))
            except (ValueError, TypeError):
                continue
        if not parsed_ids:
            return _error("No valid document IDs specified.")

        doc_ids = ready_document_ids(request.user, parsed_ids)
        if not doc_ids:
            return _error("None of the selected documents are ready for search.")
    else:
        doc_ids = ready_document_ids(request.user)
        if not doc_ids:
            return _error(
                "No ready documents to search. Upload documents and wait for processing to finish."
            )

    from django.conf import settings as dj_settings

    try:
        top_k = int(data.get("top_k") or getattr(dj_settings, "RAG_TOP_K", 5))
    except (ValueError, TypeError):
        top_k = 5
    top_k = max(1, min(20, top_k))

    try:
        chunks = retrieve_chunks(doc_ids, question, top_k=top_k)
        result = rag_answer(question, chunks)
    except Exception as e:  # noqa: BLE001
        return _error(f"RAG query failed: {e}", code=status.HTTP_503_SERVICE_UNAVAILABLE)

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

    return _ok({
        "answer": result["answer"],
        "sources": sources,
        "question": question,
        "grounded": result.get("grounded", True),
        "groundedness_reason": result.get("groundedness_reason", ""),
    })
