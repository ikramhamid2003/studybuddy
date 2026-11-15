# 📚 StudyBuddy AI — Full Stack


**Live Web App:** [https://studybuddy-omega-gray.vercel.app/](https://studybuddy-omega-gray.vercel.app/)  
**Backend API:** Deployed on Render · **Database:** Neon PostgreSQL

> An AI-powered study companion featuring **Explain**, **Summarize**, **Quiz Generator**, **Flashcard Creator**, an **All-in-One Studio** that runs every tool from one page, a **Real-Time Streaming AI Chatbot** with saved conversations, and **Document RAG** — upload your own notes, then ground *any* tool's output in their contents with cited sources.
>
> **Tech Stack:** React + Tailwind CSS + React Query · Django REST Framework · LangChain (`langchain-groq` / `ChatGroq`) on the Groq API (`openai/gpt-oss-120b`) · Firecrawl for clean URL scraping · Gemini Embedding 2 for RAG embeddings · Neon PostgreSQL (pgvector retrieval with automatic fallback) · JWT · Pytest & Ruff · Docker Compose for an optional one-command local stack (pgvector Postgres + gunicorn + nginx)

---

## ✨ Features

- **5 AI Study Tools**, each with its own saved history:
  - 🧠 **Explain Concept:** Clear explanations tailored to Beginner, Intermediate, or Advanced levels with analogies and examples.
  - 📝 **Summarize Notes:** Condenses study material into concise summaries, key concepts, defined terms, and study tips.
  - ❓ **Quiz Generator:** Generates customizable multiple-choice quizzes with explanations for correct answers.
  - 🎴 **Flashcard Creator:** Creates interactive 3D flip flashcards with hints and **Anki CSV export**.
  - 💬 **AI Study Buddy Chat:** Multi-turn conversational AI tutor with **real-time word-by-word streaming (SSE)**, **persisted chat sessions** (create, rename, delete) stored in PostgreSQL, and optional document grounding with per-message citations.
- **🎛️ All-in-One Studio (`/all`):** Runs any tool with its full options in one place — including the **My documents** grounding picker — filters the combined generation history by tool, and lets you reopen or **delete** any saved result.
- **🏠 Adaptive Home (`/`), one route with two faces:** Signed out, a landing page whose "try the router" demo runs the *real* `routeIntent` keyword router — not a mock. Signed in, a personalized dashboard assembled only from rows the API already returns: day streak, a 14-day activity sparkline, tool mix, an onboarding checklist whose ticks are earned by real generations / sessions / documents, next-step suggestions derived from your last topic, recent conversations, your document library, and cumulative tokens + priced cost from `GET /api/usage/` (previously an endpoint nothing consumed). The hero focus box routes whatever you type to the matching tool and hands the text over pre-filled through a one-shot `sessionStorage` hand-off. Every derived metric is a pure function of `(rows, now)` in `frontend/src/utils/personalize.js`, unit-tested with an injected clock so no number on the page can be fabricated. **A failed request is never dressed up as an empty account:** the dashboard distinguishes *pending* from *empty* from *failed*, so an offline endpoint raises a rose alert banner naming each broken panel and its server message with a **Retry** button that refetches only the failed queries, an unknown metric renders `—` instead of a fabricated `0`, and the empty-state copy ("Nothing saved yet", "No saved conversations yet", "Upload a PDF…") appears only after a successful load. Setup progress and next-step suggestions stay hidden until generations, sessions and documents have all arrived, because a checklist computed from half-loaded data is a lie.
- **📎 Ground Any Tool in Your Documents:** The **My documents** picker is not confined to one page — Explain, Summarize, Quiz, Flashcards, Chat **and** the All-in-One Studio each carry the same document panel, so any generation can be grounded instead of answered from model memory. A selection that fits inside a 24,000-character budget is fed to the prompt **whole** (raw extracted text, no retrieval); anything larger or not yet extracted falls back to **top-k retrieval** over the selected documents. Selected excerpts are folded into the prompt with a "do not invent beyond these notes" preamble and the response comes back with **SOURCES** citations. While a selection is active, each page also shows a one-line note under its input — "The output will be based on the selected documents" — which disappears entirely when nothing is picked (`shared/GroundingNote.jsx`). Guards: document IDs must be owned by the caller *and* `ready` (a foreign or still-ingesting ID is refused with 400 before any LLM call), a grounding failure aborts with 400/503 rather than streaming or returning an ungrounded answer, the document set is part of the cached prompt key, so two different libraries never share one response, and one generation can cite at most **25 documents** — the picker refuses a 26th tick (removals are always allowed) and trims a selection restored from storage, because `GenerateSerializer`/`ChatSerializer` reject a longer `document_ids` list outright rather than truncating it. The same limit is enforced by the backend on `POST /api/rag/query/`: an explicit selection longer than 25 is refused with **400** `"document_ids must contain at most 25 document IDs."` *before* the ids are parsed or any ownership lookup runs, while **omitting** the field still searches every ready owned document — the cap limits one selection, never the library.
- **📄 Document Ingestion & Retrieval:** Upload **PDF, TXT, or MD** files from any tool page. Documents are ingested in a background thread (extract → chunk → embed with **Gemini Embedding 2**), retrieval runs over **pgvector** on PostgreSQL with a seamless in-process numpy cosine-similarity fallback, and answers are generated by **Groq** as plain text (no raw markdown) with citations back to the source documents. The standalone **Ask My Docs** page (`/rag`) was retired once every tool grounded itself from the shared selection; the `/api/rag/*` endpoints remain (`upload`, `documents`, status polling, `delete`, and the `query` endpoint the retired page used).
- **🌐 Firecrawl Web Scraping:** Paste a URL into Explain, Summarize, Quiz, Flashcards, or Chat and the page is scraped with the **Firecrawl API** into clean markdown — JavaScript-rendered pages included — then handed to **Groq** for the final answer. Plain-text topics skip scraping entirely and go straight to **Groq**. If `FIRECRAWL_API_KEY` is not configured or a scrape fails, a built-in requests/BeautifulSoup scraper takes over automatically. Every fetch is **SSRF-guarded** (CWE-918): the URL scheme, blocklisted domains/paths, and the DNS-resolved IP are validated (loopback, private, and link-local ranges — including cloud metadata addresses — are refused, closing DNS-rebinding and encoded-IP bypasses), and redirects are followed manually with every hop re-validated (max 3 hops). Setting the optional `ALLOWED_SCRAPE_DOMAINS` adds a third gate — a comma-separated hostname allowlist matched by suffix, so `edu` admits `mit.edu` and `cs.mit.edu`; with it unset, scraping stays open to every host that passes the SSRF and blocklist checks.
- **🦜 LangChain Integration:** All LLM calls go through `langchain-groq` (`ChatGroq`) in `langchain_client.py` — plain text, JSON, SSE streaming, and **structured output validated against Pydantic schemas** (Quiz & Flashcards). Structured calls use JSON prompting with `JsonOutputParser` rather than native tool-calling, so they also work on models that do not implement tools. The client is built with a **30-second request timeout and `max_retries=0`**: a stalled provider then surfaces as an error instead of pinning a gunicorn thread until the worker is killed, and the SDK's own retries cannot multiply the structured-output fallback — that path makes at most **two** attempts (tool-calling, then JSON prompting), which is exactly what the test suite asserts.
- **⚡ High-Performance Groq LLM API:** Fast, low-latency Groq models — `openai/gpt-oss-120b` by default, overridable with `GROQ_MODEL`.
- **💾 Database Request Caching:** Identical LLM requests are cached in Django for 7 days (`studybuddy_cache` table), eliminating duplicate API costs and serving instant responses. The four JSON tools participate — keyed on the fully-expanded prompt (including any fetched web content and any grounded document excerpts) so changed options or a different document set never share a response — while live chat (history-dependent) and RAG queries (grounded in a changing document set) are never cached. Failed LLM calls are never cached.
- **🔄 React Query Integration:** Efficient frontend data fetching, caching, and mutation state management; history and session lists invalidate automatically after a generate, rename, or delete — including the dashboard keys (`generations`, `chat_sessions`, `usage_stats`) that a tool page's mutation used to leave stale inside their 60-second `staleTime`, so the budget meter could keep showing the spend from before the turn. Losing the token — logout, a refused refresh, or a token this build can no longer decode — clears the whole query cache and drops the previous account's document selection, so the next student on the same browser never reads the last one's data out of memory.
- **🛑 Walk-Away Cancellation:** Every tool page and the chat stream runs its request on an `AbortController` that fires when you navigate away, start a new chat, or switch sessions. A reply you abandoned can no longer append its remaining tokens into whichever transcript is on screen by then, and an abandoned **streamed chat turn also ends at the server**, so the rest of it is neither generated nor billed (a non-streaming `/api/generate/` call still runs to completion server-side — the abort cancels the client's wait, not the provider's). An abort is never reported as a failure: no error toast, and an unfinished reply is not marked complete. `shared/generationAbort.js` owns the pattern and `utils/api.test.js` covers the cancelled-stream path.
- **📱 Responsive UI:** A desktop sidebar that collapses to an icon rail, a chat session rail that collapses the same way, and both becoming a dropdown menu / slide-over drawer on smaller screens.
- **🔐 Session & Security:** JWT authentication (`rest_framework_simplejwt`, 1-day access / 7-day refresh tokens, with the `username` embedded in the token payload so the sidebar can name the signed-in student) with automatic bearer-token injection, anonymous rate limiting (60 req/hour) on the API, and SSRF-hardened URL fetching (resolved-IP validation + per-hop redirect re-checks). Sessions whose access token predates the `username` claim self-heal via `GET /api/auth/me/`, so the sidebar shows the real handle without forcing a re-login.
- **🧮 Token & Cost Tracking:** `langchain_client.py` reads each response's provider-reported token counts into a per-request `ContextVar` (`_record_usage` / `take_last_usage`), and `GenerateView` writes them onto the `Generation` row — `input_tokens`, `output_tokens`, and `cost` from the per-million rates in `settings.GROQ_PRICE_PER_M_INPUT` / `_OUTPUT` — which `GET /api/usage/` then aggregates. Measured 2026-10-16 through the live HTTP path: a cold `explain` recorded **209 in / 477 out**, and the identical repeat (a response-cache hit) recorded **0 / 0** while returning the same payload, because it never reaches the provider. Cost reads `0.0000` until both price variables are set for the configured model — an honest zero rather than a guessed rate.
- **🚦 Per-User Daily Token Budget:** Each account gets a daily allowance (`USER_TOKEN_LIMIT`, default **10,000** tokens, `0` disables it). `tokens_used_today` sums the day's `Generation` and `UsageLog` tokens — and streamed chat now writes a `UsageLog` row so it counts too, closing the gap where only `/api/generate/` was metered. `GenerateView` and `ChatStreamView` call `enforce_daily_token_limit` **before** any model call and return **429** with a plain-language message once the budget is spent (a request can overshoot by at most one call, since a call's cost is unknown until it runs). A stream the reader abandons mid-reply still counts: `ChatStreamView` records the turn in a `finally`, because a disconnect arrives as `GeneratorExit` — which the ordinary error handler cannot catch — and unrecorded tokens would make the cap bypassable by simply closing the tab. `GET /api/usage/` additionally returns `daily_token_limit`, `tokens_used_today` and `tokens_remaining_today`, which the dashboard renders as a "Daily token budget" meter that turns amber near the cap and rose when spent.
- **📊 Telemetry & Error Tracking:** Vercel Analytics & Speed Insights for Core Web Vitals, and **GlitchTip** (Sentry-compatible) error tracking on both frontend (`@sentry/react` with session replay) and backend (`sentry-sdk` Django integration).
- **🔎 Server-Reported Error Reasons:** the API client (`src/utils/api.js`) extracts the server's own reason out of a DRF error body instead of showing a generic label — field arrays (`{"topic": ["This field may not be blank."]}`), `non_field_errors`, and nested dictionaries such as `{"document_ids": {"0": ["A valid integer is required."]}}` are all unwrapped, with the precedence `error` → `detail` → first nested reason → `"<path> failed (HTTP <status>)"`. The helper (`rejectionMessage`) is exported from `api.js` and shared by every explicit-endpoint call, so a rejected signup, an over-long document selection and an offline dashboard all say what actually went wrong.
- **🐳 Local Docker Stack (optional):** `docker compose up --build` brings up the whole app without a local Python or Node install — **pgvector Postgres** (the `vector` extension is created by an init script, and the database publishes no host port), the **Django backend** on `python:3.12-slim` running gunicorn with the same flags as Render (1 worker, 4 threads, 120 s timeout) and performing its migration-drift check, `migrate`, `createcachetable` and `collectstatic` on boot, and an **nginx-served React build** that proxies `/api/` to the backend with proxy buffering disabled so streamed chat still streams. Both ports bind to `127.0.0.1` only. See the **🐳 Docker Quickstart** section below.
- **🛡️ Quality Gates:** Ruff Python linter, a **151-test Pytest suite**, ESLint, and **112 Jest tests** in 8 suites (API-client coverage including document-grounded streaming, request cancellation and server-reported error reasons, session teardown, the reason an auth endpoint rejects a signup, document-selection ownership and the 25-document cap, a 31-test personalization suite for streaks / activity windows / tool mix / intent routing / suggestions / checklist, a 14-test dashboard suite that keeps a failed request from masquerading as an empty account, plus `Button`, `Card` and `Input` render tests) — all enforced in **GitHub Actions CI/CD**, which also checks for unmigrated model changes and runs the pgvector retrieval SQL against a real Postgres.

---

## 📊 By the numbers

Every figure below is reproducible from this repository — measured on the current working tree, or read directly from the config that enforces it. Anything that would take a live LLM call to obtain is called out as unmeasured instead of being estimated.

### Scale

| Area | Count | How to verify |
|------|-------|---------------|
| Backend Python files / lines | 42 files · 6,275 LOC | `find backend -name '*.py' -not -path '*/venv/*' \| wc -l` and `-exec cat {} + \| wc -l` |
| Frontend source files / lines | 52 files · 9,435 LOC | `find frontend/src \( -name '*.js' -o -name '*.jsx' -o -name '*.css' \)` counted the same way |
| API paths (OpenAPI) | 17 | `GET /api/schema/` → count `paths:` keys |
| Frontend routes | 11 | `frontend/src/App.jsx` |
| Django migrations (app / applied) | 6 files · 36 applied | `ls backend/study_api/migrations`; `django_migrations` |
| Test modules · tests | 11 pytest files · 151 tests · 8 Jest files · 112 tests | `pytest --collect-only -q`; `npm test -- --watchAll=false` |
| Python dependencies · npm deps | 29 pinned · 22 runtime + 7 dev | `backend/requirements.txt` (install), `backend/requirements-dev.txt` (include `-r` line), `package.json` |
| AI tools persisted per request type | 5 (`explain`, `summarize`, `quiz`, `flashcards`, `chat`) | `GenerateSerializer.type` choices |
| Endpoints accepting `document_ids` | 3 (`/api/generate/` for all 5 tool types, `/api/chat/stream/`, `/api/rag/query/` — the last serves the retired Ask My Docs page's endpoint, no longer called by the UI) | `grep -n document_ids backend/study_api/views.py backend/study_api/dispatchers.py` |
| Tests covering RAG + grounding | 69 of the 151 (`test_rag.py` 54 · `test_generations.py` 15) | `pytest --collect-only -q \| grep -c test_rag` and `grep -c test_generations` |
| Local Docker stack | 3 services (`db`, `backend`, `frontend`) | `docker compose config --services` |

### Quality & build (measured 2026-11-15 · Windows · Node 24.13.1 · Python 3.12.13)

| Check | Result |
|-------|--------|
| `ruff check backend/` | **0 errors** (was 6) |
| `pytest` | **150 passed, 1 skipped**, 0 failed · **151 collected** · 116.26 s (the skip is the pgvector case, which needs the CI Postgres job; wall time varies with machine load — the same suite measured 104.85 s unattended and 266.17 s on an earlier run) |
| `jest` (all 8 suites) | **112 passed**, 0 failed · 6.80 s (wall time varies with machine load — the same suites ran in 14.29 s under load) |
| `npm run build` | Compiled successfully · **207.55 kB** gzipped JS, **14.29 kB** gzipped CSS |
| `npx eslint src --ext .js,.jsx` | **0 errors, 0 warnings** — ESLint is not `--max-warnings 0`, so CI stays green on warnings |
| `docker compose up --build` | **Stack smoke-tested** (2026-11-15, Docker 29.9.2): all three services reach `healthy`; `GET /api/health/`, the OpenAPI schema, register → login → `auth/me`, the 401 guard on an unauthenticated call, `generations` / `sessions` / `rag/documents` / `usage`, and a real `POST /api/generate/` all succeed **through the nginx proxy**. A cold generation returned in 2,912 ms; the identical repeat was served from the response cache in 84 ms and billed **0 extra tokens**. `POST /api/chat/stream/` returned `text/event-stream` with 31 `chunk` frames and a closing `{"done": true, "session_id": null, "sources": []}` frame, first frame at 858 ms. Postgres confirmed `vector` 0.8.7, 36 applied migrations and the `studybuddy_cache` table |
| `npm run build` (in the container image) | Compiled successfully · **117.76 kB** gzipped JS, 14.29 kB gzipped CSS — smaller than the 207.55 kB local build because the container sets `REACT_APP_GLITCHTIP_DSN=""`, so `@sentry/react` is not bundled (the local build reads `frontend/.env.production`, which sets a DSN) |

### Performance levers, with the value each one is set to

These are the mechanisms that actually control cost and latency — the numbers are the configured limits, not a marketing estimate.

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

### Measured end-to-end (2026-10-16, local dev stack)

Conditions: `DEBUG=True`, Django dev server on `127.0.0.1:8000`, SQLite backend, Groq `openai/gpt-oss-120b`, Gemini embeddings for RAG. Prompts used unique nonces so nothing was pre-warmed. Latency rows are wall-clock from the client; token rows are provider-reported counts.

**Scope of the 2026-11-15 refresh:** only the static and suite figures above were re-measured (file and line counts, test counts, lint, build, compose validation). No live-provider call was made, so this table below is the 2026-10-16 record and no new speedup or accuracy figure is claimed anywhere in this README.

One caveat about that dev server: every local `runserver` on `:8000` in this environment was started with `--noreload`, so a listening process can predate the code being tested. The token-persistence figures quoted in Features were therefore re-measured against a freshly started server on its own port.

| What was compared | Measured result | Samples |
|-------------------|-----------------|---------|
| **Cache cold vs warm**, identical prompt through `POST /api/generate/` | median **1,880 ms → 32.6 ms**, i.e. **98.3% lower latency (~58×)**; a warm call issues no provider request at all | n = 3 pairs |
| **Streaming, long answer** (~400 words requested) | first visible token at **949 ms** while the complete non-streaming reply took **2,026 ms** → the user starts reading at **47%** of the total wait (506 SSE frames) | n = 1 |
| **Streaming, short answer** (two sentences) | first token at **1,187 ms** vs a complete non-streaming reply in **756 ms** → streaming is **slower** for short output | n = 1 |
| **RAG vs whole document in the prompt**, same question, same model, same `max_tokens` | **856 vs 2,366 input tokens = 63.8% fewer**, with the same correct answer and identical output (114 tokens both arms) | n = 1 each |
| **Retrieval overhead** | `retrieve_chunks()` **1,348 ms**, dominated by the Gemini query-embedding network call; the numpy cosine pass inside it is **0.0145 ms** median | n = 1 |
| **Document ingestion** | 10,583-character text file → upload accepted in **39 ms**, 18 chunks indexed, status `ready` after **3,169 ms** | n = 1 |

Read these honestly:

- The caching figure is the only multi-sample result and is the robust one. Single-sample rows carry provider-side network variance — note that the retrieved arm took *longer* in LLM time (2,604 ms vs 1,040 ms) despite sending 63.8% fewer tokens, which is well inside the variance of one request each, so **retrieval is measured as a cost and context-window saving here, not a latency win**.
- Streaming has a genuine crossover: it lost on a two-sentence answer and won on a 400-word one. A README that simply said "streaming makes chat faster" would be wrong.
- The RAG control arm pasted the entire 10,549-character document into the same prompt template the shipped path uses, and both arms answered correctly from the single section containing the fact, so the 63.8% token reduction is not bought with a quality loss on this sample. It is one question against one 18-chunk document — not an accuracy study.

### What this repo does *not* claim

No retrieval-accuracy or answer-quality benchmark exists across a question set, so no accuracy percentage is stated. Groq and Gemini throughput is provider-side, varies with account and load, and is only sampled above. Likewise, grounding every tool in the caller's documents is a behaviour with tests behind it, not a measured quality lift: the anti-hallucination instruction was verified on a single question whose answer is absent from the uploaded notes (the model abstained instead of inventing), and no study says how much grounded quiz or flashcard output beats ungrounded output.

Token figures match the persistence path, and that path has limits worth stating: `GenerateView` writes provider-reported counts and the priced cost onto every `Generation` it creates, and `/api/usage/` sums those rows together with the `UsageLog` rows that streamed chat writes for each turn — so a streamed conversation is metered too, which is what makes chat spend count against the daily budget. The one path that still records nothing is `POST /api/rag/query/`: it is the endpoint of the retired Ask My Docs page, is not called by the UI, and creates neither row, so its tokens are absent from those totals. `cost` reads `0.0000` until `GROQ_PRICE_PER_M_INPUT` and `GROQ_PRICE_PER_M_OUTPUT` are configured for the running model.

---

## 📁 Repository Structure

```text
studybuddy/
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI pipeline (Ruff + migration-drift check + Pytest + pgvector job + ESLint + Jest)
├── frontend/                  # React + Tailwind CSS UI
│   ├── public/
│   ├── src/
│   │   ├── components/       # Layout (collapsible sidebar / mobile dropdown), PageHeader, Card,
│   │   │                     # Button, Input, LoadingSkeleton, ToolHistory, ErrorBoundary
│   │   │   ├── shared/       # ChatBubble, Flashcard, ScoreCard, SectionTitle, TypeBadge,
│   │   │   │                 # DocumentPicker + DocumentSources + GroundingNote (the grounding
│   │   │   │                 # panel reused by every tool page), the useDocumentLibrary() hook
│   │   │   │                 # behind them (+4-test ownership suite) and useGenerationAbort()
│   │   │   └── home/         # HomeDashboard (signed-in personalized face, +14-test
│   │   │                     # failure-semantics suite), HomeLanding (visitor
│   │   │                     # face), Sparkline + ProgressRing (hand-rolled SVG, no chart lib)
│   │   ├── pages/            # Home, All, Explain, Summarize, Quiz, Flashcards, Chat, Login, Register
│   │   ├── context/          # AuthContext for JWT session management (+7-test cache-teardown and
│   │   │                     # auth-rejection suite)
│   │   ├── utils/            # api.js (explicit resource client + the shared rejectionMessage()
│   │   │                     # error-reason extractor), api.test.js (46-test Jest suite),
│   │   │                     # routeColors, clipboard,
│   │   │                     # personalize.js (+31-test suite) and pendingTopic.js (home → tool pre-fill hand-off)
│   │   ├── App.jsx           # Routing & React Query provider
│   │   ├── index.css         # Tailwind directives & menu / button / icon component classes
│   │   └── .dockerignore     # Keeps node_modules / build / .env out of the image build context
│   └── package.json
│
├── backend/                    # Django REST Framework API
│   ├── studybuddy/            # Project config (settings.py, urls.py, wsgi.py)
│   ├── study_api/             # API surface
│   │   ├── dispatchers.py     # Shared action handlers (usage, generations, RAG, suggestions)
│   │   ├── langchain_client.py # LangChain/Groq client (text, JSON, streaming, structured output)
│   │   ├── rag_pipeline.py    # RAG: extraction, chunking, Gemini embeddings, retrieval, grounded answers
│   │   ├── content_fetcher.py # URL → clean markdown (Firecrawl when configured, built-in scraper otherwise); SSRF-guarded
│   │   ├── models.py          # ChatSession, ChatMessage, Generation, Document & DocumentChunk persistence
│   │   ├── schemas.py         # Pydantic schemas for structured output
│   │   ├── signals.py         # post_save hook on User → admin signup notification email
│   │   └── tests/             # Pytest suite (views, generations, chat sessions, langchain client, RAG, content fetcher)
│   ├── build.sh               # Render build: runtime-only install → migration-drift check → collectstatic → migrate
│   ├── manage.py
│   ├── pytest.ini
│   ├── requirements.txt       # Runtime-only install used by build.sh
│   ├── requirements-dev.txt   # pytest / ruff / type stubs — CI and local dev only, never deployed
│   ├── .dockerignore          # Keeps venv / .env / sqlite out of the image build context
│   └── .env                   # Local env vars (gitignored — never commit)
│
├── docker-compose.yml          # Local 3-service stack: pgvector db + gunicorn backend + nginx SPA
├── render.yaml                 # Render Blueprint (Infrastructure-as-Code)
└── README.md
```

---

## ⚙️ 1. Backend Setup

### Prerequisites
- Python 3.12+ installed
- A PostgreSQL database — the easiest free option is [Neon](https://neon.tech) (copy the connection string)
- Free Groq API key from [console.groq.com](https://console.groq.com) — answer generation
- Free Gemini API key from [aistudio.google.com](https://aistudio.google.com/app/apikey) — RAG embeddings
- Optional: Firecrawl API key from [firecrawl.dev](https://www.firecrawl.dev) — cleaner URL scraping (a built-in scraper is used without it)

### Steps

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
source venv/bin/activate        # On macOS/Linux
venv\Scripts\activate           # On Windows

# Install dependencies (dev pulls in pytest + ruff on top of the runtime set)
pip install -r requirements-dev.txt

# Create .env file in the backend directory
cat <<EOT > .env
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
# Optional — USD per million tokens for GROQ_MODEL. Left unset, /api/usage/ still
# records real token counts but reports a cost of 0.0000 instead of a guessed rate.
GROQ_PRICE_PER_M_INPUT=0
GROQ_PRICE_PER_M_OUTPUT=0
GEMINI_API_KEY=your_gemini_api_key_here
# Optional — clean URL scraping via Firecrawl; without it the built-in scraper is used
FIRECRAWL_API_KEY=fc_your_firecrawl_api_key_here
# Optional — comma-separated hostname allowlist for URL scraping. Matching is
# suffix-based, so "edu" admits mit.edu and cs.mit.edu. Left unset, scrapes are
# still gated by the built-in SSRF checks and domain blocklist.
ALLOWED_SCRAPE_DOMAINS=
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
# Any Postgres URL is forced onto TLS by default. Set this only for a local
# Postgres built without SSL; sqlite URLs ignore the option entirely (their
# driver rejects connection options), so it stays commented here.
# DB_SSL_REQUIRE=false
SECRET_KEY=some-long-random-secret-key
# Signup notifications stay disabled while SIGNUP_NOTIFICATION_EMAIL is empty —
# filling it is the only switch, and it delivers from a local run. A deployed
# Render free instance cannot send at all: ports 25/465/587 are blocked there
# (see the deploy note below). For Gmail: EMAIL_HOST=smtp.gmail.com, a
# 16-character App Password (Google account → Security → 2-Step Verification →
# App passwords) in EMAIL_HOST_PASSWORD, and DEFAULT_FROM_EMAIL must equal
# EMAIL_HOST_USER or Gmail rejects the send. A normal Google password will not
# work over SMTP.
SIGNUP_NOTIFICATION_EMAIL=you@example.com
DEFAULT_FROM_EMAIL=your-smtp-sender@example.com
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-smtp-username
EMAIL_HOST_PASSWORD=your-smtp-password-or-app-password
EMAIL_USE_TLS=true
# The notification is sent inside the signup request, so this bounds how long an
# unresponsive SMTP host can stall it. Defaults to 5 seconds; without it the
# socket blocks on the OS TCP timeout (21 s on Windows, minutes on Linux).
EMAIL_TIMEOUT=5
# Local development only. The code default is False, because a deployment that
# leaves DEBUG on answers failed requests with tracebacks that dump settings.
DEBUG=True
# Optional rate-limit ceilings (defaults shown). "generate" / "rag" / "chat"
# scope the heaviest endpoints separately from the anon and user baselines.
THROTTLE_ANON_RATE=60/hour
THROTTLE_USER_RATE=300/hour
THROTTLE_GENERATE_RATE=60/hour
THROTTLE_RAG_RATE=40/hour
THROTTLE_CHAT_RATE=90/hour
# Per-user daily token budget (input + output across all tools and streamed
# chat). Requests are refused with 429 once spent; resets at midnight UTC.
# Set to 0 to disable the cap.
USER_TOKEN_LIMIT=10000
# Optional RAG tunables (defaults shown; changing RAG_EMBED_MODEL or
# RAG_EMBED_DIMENSIONS requires re-indexing all uploaded documents)
RAG_EMBED_MODEL=gemini-embedding-2
RAG_EMBED_DIMENSIONS=768
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=150
RAG_TOP_K=5
RAG_MAX_UPLOAD_MB=20
EOT
# Optional: GLITCHTIP_DSN for backend error tracking

# Apply database migrations & create the cache table
python manage.py migrate
python manage.py createcachetable

# Start Django development server
python manage.py runserver
```

Backend server runs at: **`http://localhost:8000`**

> **Notes**
> - Running the Pytest suite does **not** require a real database — tests automatically switch to SQLite (`db_test.sqlite3`). One exception: the pgvector branch of `retrieve_chunks()` cannot run on SQLite, so CI sets `TEST_DATABASE_URL` to a Postgres + pgvector service for that job only.
> - Omitting `DATABASE_URL` also works for local development: settings fall back to `backend/db.sqlite3`.
> - `ALLOWED_HOSTS` defaults to `localhost,127.0.0.1,.onrender.com`, so local development needs nothing extra. If you set it yourself (for example by copying a deployed value into `.env`), include `127.0.0.1` — otherwise Django rejects every local request with `DisallowedHost` (HTTP 400).

---

## 💻 2. Frontend Setup

```bash
cd frontend

# Install Node modules
npm install

# Start React development server
npm start
```

Frontend application runs at: **`http://localhost:3000`** and calls `http://localhost:8000/api` by default. Point it elsewhere with `REACT_APP_API_URL` (set in `.env` for dev, `.env.production` for builds).

---

## 🐳 Docker Quickstart (optional)

Everything above works without Docker. If you would rather not install Python and Node locally, the Compose file brings the whole stack up with one command — it mirrors the deployed topology (gunicorn + nginx + Postgres) rather than the hot-reloading dev servers. The stack was smoke-tested end to end on 2026-11-15 (Docker 29.9.2): all three services reach `healthy`, and every endpoint below answers correctly through the nginx proxy.

### Prerequisites
- **Docker Desktop** (Windows/macOS) or **Docker Engine + Compose v2** (Linux).
- A **`backend/.env`** file. Compose reads it through `env_file:`, and it is gitignored, so a fresh clone has none — copy the template from the **⚙️ 1. Backend Setup** section above (at minimum `GROQ_API_KEY` and `GEMINI_API_KEY`) and save it as `backend/.env` before starting. Without it the stack refuses to start.

### Run it
```bash
# From the repository root
docker compose up --build
```

| Service | What it is | Notes |
|---------|------------|-------|
| `db` | `pgvector/pgvector:pg16` | The `vector` extension is created by an init script on first boot, so the **pgvector** retrieval path is exercised locally — not the numpy fallback. It publishes **no host port**; only the backend talks to it. Data lives in the `postgres_data` volume. |
| `backend` | `python:3.12-slim` + gunicorn | Runtime-only dependencies (the same `requirements.txt` Render installs), a non-root user, and gunicorn configured exactly like `render.yaml`: **1 worker, 4 threads, 120 s timeout**. On boot it runs the **migration-drift check** (`makemigrations --check`), then `migrate`, `createcachetable` and `collectstatic`. Health-checked at `/api/health/`. |
| `frontend` | `node:24` build served by `nginx:1.28-alpine` | The SPA is built with `REACT_APP_API_URL=/api` and nginx proxies `/api/` to the backend. `proxy_buffering off` keeps **streamed chat streaming** instead of buffering it, and `client_max_body_size 21m` covers the 20 MB (`RAG_MAX_UPLOAD_MB`) document upload. The image build is ~90 kB gzipped JS smaller than a local `npm run build` because GlitchTip is disabled here. |

### Where it runs
- App: **`http://localhost:3000`** · API: **`http://localhost:8000`** — both bound to `127.0.0.1` only.
- Override with `FRONTEND_PORT` / `BACKEND_PORT` (e.g. `FRONTEND_PORT=4000 docker compose up`).

### What differs from the manual setup
- **No hot reload.** The frontend is a production build behind nginx; re-run `docker compose up --build frontend` after changing `frontend/src`. The backend has no `--reload` either.
- **Real Postgres + pgvector**, so the numpy cosine fallback is *not* the path being exercised here — use the manual setup if you want to test that branch.
- **Signup emails are off** (`SIGNUP_NOTIFICATION_EMAIL` is emptied by the compose environment) and GlitchTip is disabled, exactly as in a deployment.
- Compose's `environment:` block overrides anything the same key sets in `backend/.env`, so the stack always points at its own `db` service with `DEBUG=false`.

### Stop and reset
```bash
docker compose down        # stop the stack, keep the database volume
docker compose down -v     # stop it and delete the Postgres volume
```

> **Troubleshooting:** if the backend exits immediately, the migration-drift check found a model change with no migration file — run `python manage.py makemigrations` locally and commit the result. If the port is already taken, set `BACKEND_PORT`/`FRONTEND_PORT` to free ports.

---

## 🧪 3. Running Quality Checks & Tests

### Backend Tests & Linting
```bash
cd backend

# Run Pytest suite (151 tests; the pgvector case skips on SQLite)
pytest

# Run Ruff lint checks
ruff check .
```

### Frontend Tests & Linting
```bash
cd frontend

# Run ESLint
npm run lint

# Run Jest tests (8 suites, 112 tests)
npm test -- --watchAll=false
```

Both suites also run automatically in GitHub Actions on every push/PR to `main`.

---

## 📡 API Endpoints Reference

The frontend uses explicit resource endpoints. Authentication routes are public; generation, chat, history, usage, and RAG routes require a JWT bearer token.

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register/` | Public | Create a new user account |
| `POST` | `/api/auth/login/` | Public | Obtain JWT access + refresh tokens |
| `POST` | `/api/auth/refresh/` | Public | Exchange a refresh token for a new access token |
| `GET` | `/api/auth/me/` | JWT | Return the signed-in user's `id` and `username`; recovers the handle for tokens issued before the `username` claim existed |
| `POST` | `/api/token/blacklist/` | Public | Revoke a refresh token (logout) |

### Study Tools & History
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/generate/` | JWT | Run any tool (explain, summarize, quiz, flashcards, chat) and persist the result; optional `document_ids` grounds it in the caller's ready documents and returns `sources` |
| `GET` | `/api/generations/` | JWT | List saved generations, newest first; optional `?type=` filter |
| `DELETE` | `/api/generations/<id>/` | JWT | Delete one saved generation owned by the caller |
| `GET` | `/api/usage/` | JWT | Return cumulative token usage and estimated cost |

### AI Chat Sessions
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/chat/stream/` | JWT | Real-time SSE streaming chat (returns `text/event-stream`); optional `document_ids` grounds each turn and the closing `done` frame carries `sources` |
| `GET` | `/api/sessions/` | JWT | List chat sessions for the sidebar |
| `POST` | `/api/sessions/` | JWT | Create an empty chat session |
| `GET` | `/api/sessions/<id>/` | JWT | Fetch one session with its persisted messages |
| `PATCH` | `/api/sessions/<id>/` | JWT | Rename a chat session |
| `DELETE` | `/api/sessions/<id>/` | JWT | Delete a chat session and its messages |
| `GET` | `/api/sessions/<id>/suggestions/` | JWT | Fetch AI-suggested follow-up questions for a session |

### Document RAG
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/rag/upload/` | JWT | Multipart document upload (`file`, optional `title`) |
| `GET` | `/api/rag/documents/` | JWT | List the caller's uploaded documents |
| `GET` | `/api/rag/documents/<id>/` | JWT | Poll document status (`pending`, `processing`, `ready`, `error`) |
| `DELETE` | `/api/rag/documents/<id>/` | JWT | Delete a document and its indexed chunks |
| `POST` | `/api/rag/query/` | JWT | Ask a question grounded in ready documents (endpoint of the retired Ask My Docs page; no longer called by the UI). An explicit `document_ids` list longer than 25 is refused with 400 `"document_ids must contain at most 25 document IDs."` before the ids are parsed or any ownership lookup runs; **omitting** the field searches every ready document the caller owns |

### System
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health/` | Public | Service health check |
| `GET` | `/api/schema/` | Public | OpenAPI 3 schema (drf-spectacular) |
| `GET` | `/api/docs/` | Public | Swagger UI for every endpoint above |

---

## 🚀 4. Deployment

> **The Compose stack is not a deployment path.** [`docker-compose.yml`](docker-compose.yml) is the *local* mirror of the Render topology — the same gunicorn flags (1 worker, 4 threads, 120 s timeout) and the same `/api/health/` probe — so a local run behaves like the deployed service. Production is Render + Neon + Vercel, described below.

### Backend (Render + Neon)
1. Create a free PostgreSQL database on [Neon](https://neon.tech) and copy its connection string.
2. Go to your [Render Dashboard](https://dashboard.render.com/) → **New +** > **Blueprint** and connect this repository — [`render.yaml`](render.yaml) defines the Django web service (gunicorn + WhiteNoise, health check at `/api/health/`).
3. In the service's Environment settings, set `DATABASE_URL` to your Neon connection string, `GROQ_API_KEY` to your Groq key, and `GEMINI_API_KEY` to your Gemini API key for RAG embeddings (all three are declared `sync: false` in the Blueprint).
4. Optionally set `GROQ_MODEL` if you want a model other than the `openai/gpt-oss-120b` default. Render's environment overrides the code default, so if you set this here you must keep it in sync with the model your Groq key can actually use.
5. Every deploy runs [`backend/build.sh`](backend/build.sh): it installs `requirements.txt` (runtime only — pytest, ruff and the type stubs live in `requirements-dev.txt` and never reach the image), then fails the build if `makemigrations --check --dry-run` finds a model with no migration, and only then runs `collectstatic`, `createcachetable` and `migrate`. The same drift check is a CI step, so an unmigrated model is caught before it can be deployed. To unwind a bad migration, use the Render shell: `python manage.py migrate study_api <previous_migration_name>` (also recorded in `build.sh`).

> **Note:** the Groq model is account-scoped. If `generate` or `chat_stream` returns a `model_not_found` error, list the models your key can use with `GET https://api.groq.com/openai/v1/models` and set `GROQ_MODEL` accordingly — the model catalogue changes over time.

> **Optional — faster RAG retrieval:** with a PostgreSQL/Neon database the pipeline uses pgvector when the `vector` extension exists and otherwise falls back to in-process numpy cosine similarity automatically. To enable the pgvector path, run `CREATE EXTENSION IF NOT EXISTS vector;` once against your database (Neon SQL editor or Render shell). Both paths read the same stored embeddings, so no re-indexing is needed — and if your Postgres user cannot create extensions, RAG still works via the fallback.

> **Optional — better URL scraping:** set `FIRECRAWL_API_KEY` (declared `sync: false` in the Blueprint) to scrape URLs with Firecrawl for clean, JS-rendered markdown. Without it, the built-in requests/BeautifulSoup scraper is used, and any Firecrawl failure falls back to it automatically.

> **Signup notification emails are local-only, by decision:** Render blocks outbound traffic to SMTP ports **25, 465 and 587 on free web services**, so `EMAIL_HOST=smtp.gmail.com:587` can never connect from the deployment however carefully the four `sync: false` values (`SIGNUP_NOTIFICATION_EMAIL`, `DEFAULT_FROM_EMAIL`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`) are entered in its dashboard. Do not spend time debugging that as a code fault. The Blueprint still pins `EMAIL_HOST=smtp.gmail.com`, `EMAIL_PORT=587`, `EMAIL_USE_TLS=true` as literals, and `SIGNUP_NOTIFICATION_EMAIL` empty keeps the feature off locally too. A *skipped* send logs nothing, but a *failed* one is not invisible: `settings.py` defines no `LOGGING` block, so Python's `logging.lastResort` writes `Could not send signup notification for user …` plus the traceback to stderr — which is exactly what Render's log stream shows, and the line's absence is what proves the recipient is empty. A stalled send is capped by `EMAIL_TIMEOUT` (5 s default). Delivering from production would mean upgrading the Render instance, or sending over HTTPS on port 443 (not blocked) through a transactional provider.

### Frontend (Vercel)
1. Connect the `frontend/` directory to Vercel.
2. Set `REACT_APP_API_URL` to your deployed Render backend URL, and optionally `REACT_APP_GLITCHTIP_DSN` for frontend error tracking.
3. Deploy! Any `*.vercel.app` origin is automatically allowed by the backend's CORS config.
