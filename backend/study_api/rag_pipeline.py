"""RAG pipeline for StudyBuddy — ingest, embed, retrieve, and generate.

Flow:
  upload  → extract text → chunk → embed → store in DocumentChunk.embedding
  query   → embed query  → cosine similarity retrieval → build prompt → LLM

The pipeline uses LangChain's RecursiveCharacterTextSplitter for chunking,
Gemini Embedding 2 for hosted embeddings, and Groq for answer generation.
Similarity search uses pgvector when PostgreSQL with the vector extension is
available, and falls back seamlessly to in-process numpy cosine similarity on
SQLite or Postgres instances without the extension.
"""
from __future__ import annotations

import io
import logging
import math
from typing import TYPE_CHECKING, Any, Protocol

import requests
from django.conf import settings
from django.db import connection

if TYPE_CHECKING:
    from .models import Document

logger = logging.getLogger(__name__)


class TextSplitter(Protocol):
    """Minimal splitter contract shared by LangChain and the fallback."""

    def split_text(self, text: str) -> list[str]: ...

# ── Lazy imports so the server starts even if optional deps are missing ───────


def _gemini_embedding_settings() -> tuple[str, str, int]:
    """Return the Gemini API credentials and embedding configuration."""
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not set. Add it to your Render environment variables.\n"
            "Create a key at: https://aistudio.google.com/app/apikey"
        )
    model = getattr(settings, "RAG_EMBED_MODEL", "gemini-embedding-2")
    dimensions = int(getattr(settings, "RAG_EMBED_DIMENSIONS", 768))
    if dimensions not in {128, 256, 512, 768, 1536, 3072}:
        raise ValueError("RAG_EMBED_DIMENSIONS must be one of 128, 256, 512, 768, 1536, or 3072.")
    return api_key, model, dimensions


def _embed_contents(contents: list[str]) -> list[list[float]]:
    """Embed text inputs with Gemini's batch endpoint.

    The batch endpoint keeps document ingestion within free-tier request limits
    and produces one vector per input instead of aggregating the whole batch.
    """
    if not contents:
        return []

    api_key, model, dimensions = _gemini_embedding_settings()
    response = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:batchEmbedContents",
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        json={
            "requests": [
                {
                    "model": f"models/{model}",
                    "content": {"parts": [{"text": content}]},
                    "output_dimensionality": dimensions,
                }
                for content in contents
            ]
        },
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    embeddings = payload.get("embeddings", [])
    vectors = [embedding.get("values", []) for embedding in embeddings]
    if len(vectors) != len(contents) or any(len(vector) != dimensions for vector in vectors):
        raise ValueError("Gemini returned an invalid embedding response.")
    return [[float(value) for value in vector] for vector in vectors]


def _get_splitter() -> TextSplitter:
    """Return a text splitter with project-configured chunk size/overlap."""
    chunk_size = getattr(settings, "RAG_CHUNK_SIZE", 800)
    chunk_overlap = getattr(settings, "RAG_CHUNK_OVERLAP", 150)
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter

        return RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
    except ImportError:
        class SimpleSplitter:
            def __init__(self, size: int, overlap: int):
                self.size = size
                self.overlap = overlap

            def split_text(self, text: str) -> list[str]:
                if not text:
                    return []
                step = max(1, self.size - self.overlap)
                return [text[i : i + self.size] for i in range(0, len(text), step)]

        return SimpleSplitter(chunk_size, chunk_overlap)


# ── Text extraction ───────────────────────────────────────────────────────────


def extract_text_from_pdf(file_bytes: bytes) -> tuple[str, int]:
    """Extract plain text from a PDF byte string.

    Returns (text, page_count). Raises ValueError on read errors or scanned files.
    """
    if not file_bytes:
        raise ValueError("The uploaded PDF file is empty.")

    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise ImportError("pypdf is required for PDF extraction: pip install pypdf") from exc

    try:
        reader = PdfReader(io.BytesIO(file_bytes))
    except Exception as exc:
        raise ValueError(f"Could not read PDF file: {exc}") from exc

    if getattr(reader, "is_encrypted", False):
        raise ValueError("Password-protected PDFs are not supported. Please upload an unencrypted file.")

    if not reader.pages:
        raise ValueError("The PDF contains no pages.")

    pages = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:  # noqa: BLE001 — one bad page should not fail the whole document
            pages.append("")

    full_text = "\n\n".join(pages).strip()
    if not full_text:
        raise ValueError(
            "No extractable text found in this PDF. If this is a scanned document or image, "
            "please upload a PDF with searchable/selectable text."
        )

    return full_text, len(reader.pages)


def extract_text_from_txt(file_bytes: bytes) -> tuple[str, int]:
    """Decode a plain-text byte string, returning (text, 1)."""
    if not file_bytes:
        raise ValueError("The uploaded text file is empty.")
    text = file_bytes.decode("utf-8", errors="replace").replace("\x00", "").strip()
    if not text:
        raise ValueError("The text file contains no readable content.")
    return text, 1


def extract_text(filename: str, file_bytes: bytes) -> tuple[str, int]:
    """Dispatch to the correct extractor based on file extension."""
    if not file_bytes:
        raise ValueError("The uploaded file is empty.")
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)
    if lower.endswith((".txt", ".md")):
        return extract_text_from_txt(file_bytes)
    raise ValueError(f"Unsupported file type: {filename!r}. Upload a PDF, TXT, or MD file.")


# ── Chunking with page-number attribution ────────────────────────────────────


def chunk_text(text: str, page_count: int) -> list[dict[str, Any]]:
    """Split *text* into overlapping chunks and estimate page numbers.

    Returns a list of dicts: [{text, chunk_index, page_number}, ...]
    The page_number is estimated by assuming uniform text distribution across
    pages — good enough for provenance display even if not exact.
    """
    splitter = _get_splitter()
    raw_chunks = splitter.split_text(text)
    total_chars = len(text) or 1  # guard div-by-zero

    result = []
    char_cursor = 0
    chunk_idx = 0
    for chunk in raw_chunks:
        clean = chunk.strip()
        if not clean:
            continue
        # Locate approximate start position of chunk within original text.
        pos = text.find(chunk[:50], char_cursor)
        if pos == -1:
            pos = char_cursor
        char_cursor = min(total_chars, pos + len(chunk))

        page_num = min(max(1, page_count), max(1, math.ceil((pos / total_chars) * max(page_count, 1))))
        result.append({
            "text": clean,
            "chunk_index": chunk_idx,
            "page_number": page_num,
        })
        chunk_idx += 1
    return result


# ── Embedding ────────────────────────────────────────────────────────────────


def embed_texts(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """Embed document chunks in batches and return their Gemini vectors."""
    if not texts:
        return []
    all_vectors = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        # Gemini Embedding 2 recommends this structure for retrieval documents.
        all_vectors.extend(_embed_contents([f"title: none | text: {text}" for text in batch]))
    return all_vectors


def embed_query(text: str) -> list[float]:
    """Embed a RAG question with Gemini's retrieval-aware query format."""
    clean = text.strip()
    if not clean:
        raise ValueError("Query string cannot be empty.")
    return _embed_contents([f"task: question answering | query: {clean}"])[0]


# ── Ingestion ────────────────────────────────────────────────────────────────


def _source_text_for_reindex(doc: Document) -> tuple[str, int]:
    """Resolve text + page_count for a document when re-indexing.

    Prefers ``raw_text`` saved at ingest time; falls back to concatenating
    existing chunk texts for documents uploaded before that field existed.
    """
    raw = (getattr(doc, "raw_text", None) or "").strip()
    if raw:
        return raw, max(1, int(doc.page_count or 1))

    from .models import DocumentChunk

    chunk_texts = list(
        DocumentChunk.objects.filter(document=doc)
        .order_by("chunk_index")
        .values_list("text", flat=True)
    )
    if not chunk_texts:
        raise ValueError(
            "No stored text available to re-index. Re-upload the document."
        )
    return "\n\n".join(chunk_texts), max(1, int(doc.page_count or 1))


def _rechunk_and_embed(doc: Document, text: str, page_count: int) -> None:
    """Chunk *text*, embed, and replace all DocumentChunk rows for *doc*."""
    from .models import DocumentChunk

    chunks = chunk_text(text, page_count)
    if not chunks:
        raise ValueError("Document produced no chunks after splitting.")

    texts = [c["text"] for c in chunks]
    vectors = embed_texts(texts)

    DocumentChunk.objects.filter(document=doc).delete()
    bulk = [
        DocumentChunk(
            document=doc,
            chunk_index=c["chunk_index"],
            text=c["text"],
            page_number=c["page_number"],
            embedding=vectors[i],
        )
        for i, c in enumerate(chunks)
    ]
    DocumentChunk.objects.bulk_create(bulk)

    doc.page_count = page_count
    doc.chunk_count = len(chunks)
    doc.status = "ready"
    doc.error_message = ""
    if not (getattr(doc, "raw_text", None) or "").strip():
        doc.raw_text = text
        doc.save(
            update_fields=[
                "page_count",
                "chunk_count",
                "status",
                "error_message",
                "raw_text",
                "updated_at",
            ]
        )
    else:
        doc.save(
            update_fields=[
                "page_count",
                "chunk_count",
                "status",
                "error_message",
                "updated_at",
            ]
        )


def ingest_document(document_id: int, file_bytes: bytes) -> None:
    """Full ingestion pipeline: extract → chunk → embed → persist.

    Runs synchronously (called from a thread by the dispatcher). Updates
    document.status to 'ready' on success or 'error' on failure.
    """
    from .models import Document

    doc = Document.objects.get(id=document_id)
    try:
        doc.status = "processing"
        doc.save(update_fields=["status", "updated_at"])

        text, page_count = extract_text(doc.filename, file_bytes)
        if not text.strip():
            raise ValueError("No readable text found in the uploaded file.")

        doc.raw_text = text
        doc.page_count = page_count
        doc.save(update_fields=["raw_text", "page_count", "updated_at"])

        _rechunk_and_embed(doc, text, page_count)

    except Exception as exc:
        logger.exception("RAG ingestion failed for document %d", document_id)
        doc.status = "error"
        doc.error_message = str(exc)[:2000]
        doc.save(update_fields=["status", "error_message", "updated_at"])


def reindex_document(document_id: int) -> None:
    """Rebuild chunks + embeddings for one document from stored text.

    Uses the current ``RAG_CHUNK_*`` / ``RAG_EMBED_*`` settings. Call this
    (or the ``reindex_documents`` management command) after changing the
    embedding model or dimensions.
    """
    from .models import Document

    doc = Document.objects.get(id=document_id)
    try:
        doc.status = "processing"
        doc.save(update_fields=["status", "updated_at"])
        text, page_count = _source_text_for_reindex(doc)
        _rechunk_and_embed(doc, text, page_count)
    except Exception as exc:
        logger.exception("RAG reindex failed for document %d", document_id)
        doc.status = "error"
        doc.error_message = str(exc)[:2000]
        doc.save(update_fields=["status", "error_message", "updated_at"])
        raise


# ── Retrieval ────────────────────────────────────────────────────────────────


def _cosine_numpy(query_vec: list[float], chunk_vecs: list[list[float]]) -> list[float]:
    """Pure-Python cosine similarity fallback."""
    import numpy as np

    q = np.array(query_vec, dtype=float)
    q_norm = q / (np.linalg.norm(q) + 1e-10)
    scores = []
    for vec in chunk_vecs:
        v = np.array(vec, dtype=float)
        v_norm = v / (np.linalg.norm(v) + 1e-10)
        scores.append(float(np.dot(q_norm, v_norm)))
    return scores


def retrieve_chunks(
    document_ids: list[int], query: str, top_k: int | None = None
) -> list[dict[str, Any]]:
    """Find the *top_k* most relevant chunks for *query* across *document_ids*.

    Tries pgvector via raw SQL when running on PostgreSQL, and falls back to
    loading embeddings and computing cosine similarity with numpy if pgvector
    is not installed or errors.
    Returns list of {text, chunk_index, page_number, document_id, document_title, score}.
    """
    if top_k is None:
        top_k = getattr(settings, "RAG_TOP_K", 5)
    top_k = max(1, min(20, int(top_k)))

    if not document_ids:
        return []

    clean_query = query.strip()
    if not clean_query:
        return []

    query_vec = embed_query(clean_query)

    db_engine = connection.vendor  # 'postgresql' | 'sqlite' | …
    if db_engine == "postgresql":
        try:
            return _retrieve_pgvector(document_ids, query_vec, top_k)
        except Exception as exc:  # noqa: BLE001 — any pgvector failure must fall back, not crash
            logger.warning("pgvector query failed (%s), falling back to numpy similarity", exc)
            return _retrieve_numpy(document_ids, query_vec, top_k)

    return _retrieve_numpy(document_ids, query_vec, top_k)


def _retrieve_pgvector(
    document_ids: list[int], query_vec: list[float], top_k: int
) -> list[dict[str, Any]]:
    """PostgreSQL path — casts the JSON embedding to vector and uses <=> operator."""
    placeholders = ",".join(["%s"] * len(document_ids))
    sql = f"""
        SELECT
            dc.id,
            dc.text,
            dc.chunk_index,
            dc.page_number,
            dc.document_id,
            d.title AS document_title,
            ((dc.embedding::text)::vector <=> %s::vector) AS distance
        FROM study_api_documentchunk dc
        JOIN study_api_document d ON d.id = dc.document_id
        WHERE dc.document_id IN ({placeholders})
        ORDER BY distance ASC
        LIMIT %s
    """
    vec_literal = "[" + ",".join(str(x) for x in query_vec) + "]"
    params = [vec_literal] + document_ids + [top_k]
    with connection.cursor() as cur:
        cur.execute(sql, params)
        cols = [desc[0] for desc in cur.description]
        rows = cur.fetchall()

    results = []
    for row in rows:
        r = dict(zip(cols, row))
        # Convert distance (0 = identical) to similarity score (1 = identical).
        r["score"] = round(1.0 - float(r.pop("distance", 0)), 4)
        results.append(r)
    return results


def _retrieve_numpy(
    document_ids: list[int], query_vec: list[float], top_k: int
) -> list[dict[str, Any]]:
    """Numpy fallback path used with SQLite or Postgres instances without pgvector."""
    from .models import DocumentChunk

    chunks = list(
        DocumentChunk.objects.filter(document_id__in=document_ids)
        .select_related("document")
        .values("id", "text", "chunk_index", "page_number", "document_id", "document__title", "embedding")
    )
    if not chunks:
        return []

    # Safeguard: ensure every chunk has a valid vector of equal length before dot product
    valid_chunks = [
        c for c in chunks
        if isinstance(c.get("embedding"), list) and len(c["embedding"]) == len(query_vec)
    ]
    if not valid_chunks:
        return []

    vecs = [c["embedding"] for c in valid_chunks]
    scores = _cosine_numpy(query_vec, vecs)

    ranked = sorted(zip(valid_chunks, scores), key=lambda x: x[1], reverse=True)
    results = []
    for chunk, score in ranked[:top_k]:
        results.append({
            "id": chunk["id"],
            "text": chunk["text"],
            "chunk_index": chunk["chunk_index"],
            "page_number": chunk["page_number"],
            "document_id": chunk["document_id"],
            "document_title": chunk["document__title"],
            "score": round(score, 4),
        })
    return results


# ── Generation ────────────────────────────────────────────────────────────────

RAG_SYSTEM = (
    "You are an expert study assistant. Use ONLY the provided document excerpts to answer "
    "the student's question. If the answer cannot be found in the excerpts, say so clearly. "
    "Always cite the document title and page number for key facts. "
    "Be concise, accurate, and helpful. You may use light markdown "
    "(headings, **bold**, lists, inline code) — the UI renders it."
)

GROUNDEDNESS_SYSTEM = (
    "You are a strict fact-checker for a study assistant. "
    "Given document excerpts and a candidate answer, decide whether every factual claim "
    "in the answer is supported by the excerpts. "
    "Respond with ONLY a valid JSON object — no markdown fences: "
    '{"grounded": true or false, "reason": "one short sentence"}'
)


def _build_rag_context(chunks: list[dict[str, Any]]) -> str:
    """Format retrieved chunks into a prompt-ready context block."""
    parts: list[str] = []
    for c in chunks:
        header = f"[{c['document_title']} — page {c.get('page_number', '?')}]"
        parts.append(f"{header}\n{c['text'][:1500]}")
    return "\n\n---\n\n".join(parts)


def check_groundedness(answer: str, chunks: list[dict[str, Any]]) -> dict[str, Any]:
    """Ask the LLM whether *answer* is supported by *chunks*.

    Returns ``{"grounded": bool, "reason": str}``. On LLM/parse failure, fails
    open (treats the answer as grounded) so a checker outage never blocks Q&A.
    """
    from .langchain_client import query_groq_json

    if not answer or not chunks:
        return {"grounded": False, "reason": "No answer or no source excerpts."}

    context = _build_rag_context(chunks)
    user_msg = (
        f"Document excerpts:\n\n{context}\n\n---\n\n"
        f"Candidate answer:\n{answer}\n\n"
        "Is every factual claim in the candidate answer supported by the excerpts?"
    )
    try:
        result = query_groq_json(GROUNDEDNESS_SYSTEM, user_msg, max_tokens=200)
        grounded = bool(result.get("grounded"))
        reason = str(result.get("reason") or "").strip() or (
            "Supported by the excerpts." if grounded else "Not fully supported by the excerpts."
        )
        return {"grounded": grounded, "reason": reason}
    except Exception:
        logger.warning("Groundedness check failed; treating answer as grounded", exc_info=True)
        return {"grounded": True, "reason": "Groundedness check unavailable."}


def rag_answer(question: str, chunks: list[dict[str, Any]]) -> dict[str, Any]:
    """Generate an answer grounded in the retrieved *chunks*.

    Returns ``{"answer": str, "grounded": bool, "groundedness_reason": str}``.
    """
    from .langchain_client import query_groq

    if not chunks:
        return {
            "answer": "I could not find relevant content in your documents to answer this question.",
            "grounded": False,
            "groundedness_reason": "No relevant chunks were retrieved.",
        }

    context = _build_rag_context(chunks)
    user_msg = f"Document excerpts:\n\n{context}\n\n---\n\nQuestion: {question}"
    answer = query_groq(RAG_SYSTEM, user_msg, max_tokens=1000)

    check = check_groundedness(answer, chunks)
    if not check["grounded"]:
        answer = (
            f"{answer}\n\n"
            f"> Caution: parts of this answer may not be fully supported by your documents "
            f"({check['reason']})."
        )

    return {
        "answer": answer,
        "grounded": check["grounded"],
        "groundedness_reason": check["reason"],
    }
