# Performance — "By the numbers"

Every figure below is reproducible from this repository — measured on the current
working tree, or read directly from the config that enforces it. Anything that would
take a live LLM call to obtain is called out as unmeasured instead of being estimated.

---

## Scale

| Area | Count | How to verify |
|------|-------|---------------|
| Backend Python files / lines | 42 files · 6,275 LOC | `find backend -name '*.py' -not -path '*/venv/*' \| wc -l` and `-exec cat {} + \| wc -l` |
| Frontend source files / lines | 52 files · 9,435 LOC | `find frontend/src \( -name '*.js' -o -name '*.jsx' -o -name '*.css' \)` counted the same way |
| API paths (OpenAPI) | 19 | `GET /api/schema/` → count `paths:` keys |
| Frontend routes | 11 | `frontend/src/App.jsx` |
| Django migrations (app / applied) | 8 files · 36 applied | `ls backend/study_api/migrations`; `django_migrations` |
| Test modules · tests | 15 pytest files · 195 tests · 20 Vitest files · 181 tests | `pytest --collect-only -q`; `npm test` |
| Dependencies | 29 pinned Python (22 runtime + 7 dev) · 18 npm (12 runtime + 6 dev) | `backend/requirements.txt` (install), `backend/requirements-dev.txt` (include `-r` line), `frontend/package.json` |
| AI tools persisted per request type | 5 (`explain`, `summarize`, `quiz`, `flashcards`, `chat`) | `GenerateSerializer.type` choices |
| Endpoints accepting `document_ids` | 3 (`/api/generate/` for all 5 tool types, `/api/chat/stream/`, `/api/rag/query/` — the last serves the retired Ask My Docs page's endpoint, no longer called by the UI) | `grep -n document_ids backend/study_api/views.py backend/study_api/dispatchers.py` |
| Tests covering RAG + grounding | 69 of the 195 (`test_rag.py` 54 · `test_generations.py` 15) | `pytest --collect-only -q \| grep -c test_rag` and `grep -c test_generations` |
| Local Docker stack | 3 services (`db`, `backend`, `frontend`) | `docker compose config --services` |

---

## Quality & build (measured 2026-11-15 · test rows re-measured 2026-11-25 · Windows · Node 24.13.1 · Python 3.12.13)

| Check | Result |
|-------|--------|
| `ruff check backend/` | **0 errors** (was 6) |
| `pytest` | **194 passed, 1 skipped**, 0 failed · **195 collected** · 4.17 s (re-measured 2026-11-25 with an MD5 password hasher selected only while testing; the 2026-11-15 run took 116.26 s because PBKDF2 dominated the auth tests. The skip is the pgvector case, which needs the CI Postgres job) |
| `npm test` (Vitest) | **181 passed**, 0 failed · 20 suites · 20.78 s (wall time varies with machine load) |
| `npm run build` | Compiled successfully · **207.55 kB** gzipped JS, **14.29 kB** gzipped CSS |
| `npx eslint src --ext .js,.jsx` | **0 errors, 0 warnings** — ESLint is not `--max-warnings 0`, so CI stays green on warnings |
| `docker compose up --build` | **Stack smoke-tested** (2026-11-15, Docker 29.9.2): all three services reach `healthy`; `GET /api/health/`, the OpenAPI schema, register → login → `auth/me`, the 401 guard on an unauthenticated call, `generations` / `sessions` / `rag/documents` / `usage`, and a real `POST /api/generate/` all succeed **through the nginx proxy**. A cold generation returned in 2,912 ms; the identical repeat was served from the response cache in 84 ms and billed **0 extra tokens**. `POST /api/chat/stream/` returned `text/event-stream` with 31 `chunk` frames and a closing `{"done": true, "session_id": null, "sources": []}` frame, first frame at 858 ms. Postgres confirmed `vector` 0.8.7, 36 applied migrations and the `studybuddy_cache` table |
| `npm run build` (in the container image) | Compiled successfully · **117.76 kB** gzipped JS, 14.29 kB gzipped CSS — smaller than the 207.55 kB local build because the container sets `REACT_APP_GLITCHTIP_DSN=""`, so `@sentry/react` is not bundled (the local build reads `frontend/.env.production`, which sets a DSN) |

---

## Performance levers, with the value each one is set to

These are the mechanisms that actually control cost and latency — the numbers are the
configured limits, not a marketing estimate.

| Lever | Setting | Effect that can be verified |
|-------|---------|-----------------------------|
| **Database response cache** | `DatabaseCache` on the `studybuddy_cache` table, TTL **7 days** (`604800 s`), keyed on tool prefix + md5 of the fully-expanded prompt | A hit is served from one indexed row read and **skips the provider round-trip entirely — 0 input and 0 output tokens billed for that request**. Four tools opt in (`explain`, `summarize`, `quiz`, `flashcards`); live chat and RAG queries are never cached, the first because it is history-dependent and the second because it is grounded in a changing document set. |
| **Bounded RAG context** | `RAG_TOP_K=5` × `RAG_CHUNK_SIZE=800`, each chunk truncated to 1,500 characters by `_build_rag_context` | An answer carries **at most 4,000 characters of retrieved source text**, independent of document size (measured 3,117 characters of context for a top-5 retrieval). Without retrieval the whole document would have to go into the prompt — and it cannot: `GenerateSerializer.topic` is capped at 8,000 characters, so a 10,583-character document is rejected before reaching the model, which is what makes RAG the only path for long material. Uploads may be as large as `RAG_MAX_UPLOAD_MB=20`. |
| **Chunk overlap** | `RAG_CHUNK_OVERLAP=150` (18.75% of the chunk) | Prevents answers straddling a chunk boundary from being missed during retrieval. |
| **One grounding authorization path** | `ready_document_ids(user, requested)` is the only owner + `status='ready'` filter, and `/api/generate/`, `/api/chat/stream/` and `/api/rag/query/` all call it | A grounded tool call can never read a document it does not own or that is still ingesting — and the three endpoints cannot drift apart on that rule, because there is only one implementation. |
| **Embedding dimension** | `RAG_EMBED_DIMENSIONS=768`, verified against the vectors actually stored per chunk | Retrieval is one 768-wide dot product per chunk. The dimension is configurable, and changing it (or the model) requires re-indexing every document. |
| **Per-scope rate limits** | anon `60/h`, user `300/h`, generate `60/h`, rag `40/h`, chat `90/h` | Expensive LLM/RAG views get a tighter ceiling than cheap list and status calls, so a runaway client cannot exhaust the Groq quota through the cheapest route. |
| **Max output tokens** | `800` default per call, `600` for chat | Caps the billed output of any single generation. |
| **Provider call timeout & retries** | `request_timeout=30.0`, `max_retries=0` on the `ChatGroq` client | A stalled provider returns an error after 30 s instead of pinning a gunicorn thread until the `--timeout 120` worker is killed. The SDK's own retries are off, so the structured-output path makes at most **2** attempts (tool-calling, then JSON prompting) instead of 2 × N — verified by a test that asserts the per-call attempt count and the four httpx timeout phases. |
| **Composite indexes** | 5 declared: `(user, created_at)`, `(user, type, created_at)` on generations; `(user, created_at)` on usage and documents; `(document, chunk_index)` on chunks | Keeps history, per-type filters and usage aggregation index-backed as rows accumulate. |
| **SSE streaming** | `stream_chat_groq` → `text/event-stream` | The first visible token arrives while the rest is still being generated, instead of after the complete response. |
| **pgvector with fallback** | vector index when the `vector` extension exists, else in-process numpy cosine | Retrieval never hard-fails on a database that cannot create extensions. |
| **Background ingestion** | `RAG_INGEST_TIMEOUT_SECONDS=600`, stale documents reaped | Upload returns immediately; embedding runs off the request thread. |

---

## Measured end-to-end (2026-10-16, local dev stack)

**Conditions:** `DEBUG=True`, Django dev server on `127.0.0.1:8000`, SQLite backend, Groq
`openai/gpt-oss-120b`, Gemini embeddings for RAG. Prompts used unique nonces so nothing
was pre-warmed. Latency rows are wall-clock from the client; token rows are
provider-reported counts.

**Scope of the 2026-11-15 refresh:** only the static and suite figures above were
re-measured (file and line counts, test counts, lint, build, compose validation). No
live-provider call was made, so this table below is the 2026-10-16 record and no new
speedup or accuracy figure is claimed anywhere in this repo.

One caveat about that dev server: every local `runserver` on `:8000` in this environment
was started with `--noreload`, so a listening process can predate the code being tested.
The token-persistence figures quoted in [Features](features.md) were therefore
re-measured against a freshly started server on its own port.

| What was compared | Measured result | Samples |
|-------------------|-----------------|---------|
| **Cache cold vs warm**, identical prompt through `POST /api/generate/` | median **1,880 ms → 32.6 ms**, i.e. **98.3% lower latency (~58×)**; a warm call issues no provider request at all | n = 3 pairs |
| **Streaming, long answer** (~400 words requested) | first visible token at **949 ms** while the complete non-streaming reply took **2,026 ms** → the user starts reading at **47%** of the total wait (506 SSE frames) | n = 1 |
| **Streaming, short answer** (two sentences) | first token at **1,187 ms** vs a complete non-streaming reply in **756 ms** → streaming is *slower* for short output | n = 1 |
| **RAG vs whole document in the prompt**, same question, same model, same `max_tokens` | **856 vs 2,366 input tokens = 63.8% fewer**, with the same correct answer and identical output (114 tokens both arms) | n = 1 each |
| **Retrieval overhead** | `retrieve_chunks()` **1,348 ms**, dominated by the Gemini query-embedding network call; the numpy cosine pass inside it is **0.0145 ms** median | n = 1 |
| **Document ingestion** | 10,583-character text file → upload accepted in **39 ms**, 18 chunks indexed, status `ready` after **3,169 ms** | n = 1 |

Read these honestly:

- The caching figure is the only multi-sample result and is the robust one. Single-sample rows carry provider-side network variance — note that the retrieved arm took *longer* in LLM time (2,604 ms vs 1,040 ms) despite sending 63.8% fewer tokens, which is well inside the variance of one request each, so **retrieval is measured as a cost and context-window saving here, not a latency win**.
- Streaming has a genuine crossover: it lost on a two-sentence answer and won on a 400-word one. A README that simply said "streaming makes chat faster" would be wrong.
- The RAG control arm pasted the entire 10,549-character document into the same prompt template the shipped path uses, and both arms answered correctly from the single section containing the fact, so the 63.8% token reduction is not bought with a quality loss on this sample. It is one question against one 18-chunk document — not an accuracy study.

---

## What this repo does *not* claim

No retrieval-accuracy or answer-quality benchmark exists across a question set, so no
accuracy percentage is stated. Groq and Gemini throughput is provider-side, varies with
account and load, and is only sampled above. Likewise, grounding every tool in the
caller's documents is a behaviour with tests behind it, not a measured quality lift: the
anti-hallucination instruction was verified on a single question whose answer is absent
from the uploaded notes (the model abstained instead of inventing), and no study says how
much grounded quiz or flashcard output beats ungrounded output.

Token figures match the persistence path, and that path has limits worth stating:
`GenerateView` writes provider-reported counts and the priced cost onto every
`Generation` it creates, and `/api/usage/` sums those rows together with the
`UsageLog` rows that streamed chat writes for each turn — so a streamed conversation is
metered too, which is what makes chat spend count against the daily budget. The one
path that still records nothing is `POST /api/rag/query/`: it is the endpoint of the
retired Ask My Docs page, is not called by the UI, and creates neither row, so its tokens
are absent from those totals. `cost` reads `0.0000` until `GROQ_PRICE_PER_M_INPUT` and
`GROQ_PRICE_PER_M_OUTPUT` are configured for the running model.
