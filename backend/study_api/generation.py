"""Tool cores: grounding, caching and prompt assembly for the AI tools.

Each ``_*_response`` function takes validated data and returns a DRF Response.
They back both GenerateView (the All-in-One Studio) and any dedicated entry
point, so every tool behaves identically however it is called.
"""

import hashlib
import logging

from django.core.cache import cache
from rest_framework import status
from rest_framework.response import Response

from .content_fetcher import process_topic_with_url
from .dispatchers import ready_document_ids
from .langchain_client import (
    chat_groq,
    query_groq_json,
    query_groq_structured,
)
from .models import Document
from .prompts import (
    CHAT_SYSTEM,
    EXPLAIN_SYSTEM,
    FLASHCARDS_SYSTEM,
    QUIZ_SYSTEM,
    SUMMARIZE_SYSTEM,
)
from .schemas import FlashcardsResponse, QuizResponse

# Lazy/safe import of the RAG pipeline — the server must start even when its
# heavy dependencies are missing (same guard dispatchers.py uses).
try:
    from .rag_pipeline import _build_rag_context, retrieve_chunks

    _HAS_RAG = True
except Exception:  # noqa: BLE001
    _HAS_RAG = False

logger = logging.getLogger(__name__)

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
    except Exception:
        logger.exception("Document search failed for user=%s", user.pk)
        return Response(
            {"error": "Document search failed. Please try again."},
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
    so only a second failure surfaces as a 502. Both attempts' tokens are
    metered: the provider charged for the failed one too.
    """

    try:
        return llm_call(system, user_msg)
    except ValueError:
        return llm_call(system, user_msg)


def _cached_json_response(prefix, user_msg, system, llm_call, docs=None):
    """Cache-wrapped LLM call shared by all JSON-returning tools."""
    try:
        # The full prompt text is the cache key input so different options do
        # not accidentally share the same model response. A grounded call also
        # folds in the document ids behind that excerpt: user_msg carries only the
        # retrieved text, so two students who uploaded the same file would
        # otherwise share one entry — and the cached payload embeds the owner's
        # document ids and titles in `sources`. Ungrounded prompts stay shared
        # across accounts, which is the dedup that actually saves provider money.
        doc_scope = ",".join(
            str(s["document_id"]) for s in (docs or {}).get("sources", [])
        )
        cache_key = prefix + hashlib.md5(f"{user_msg}|{doc_scope}".encode()).hexdigest()
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
    except ValueError:
        # The message reaches the client, but nothing else: Sentry never sees a
        # handled exception, so a Groq outage or rate-limit storm would otherwise
        # leave no server-side trace. Prompt text stays out of the log.
        logger.exception("AI response failed schema parsing for tool=%s", prefix)
        return Response(
            {"error": "Failed to parse AI response. Please try again."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except Exception:
        logger.exception("AI request failed for tool=%s", prefix)
        return Response(
            {"error": "AI request failed. Please try again."},
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
    except Exception:
        logger.exception("Chat reply request failed")
        return Response(
            {"error": "AI request failed. Please try again."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
