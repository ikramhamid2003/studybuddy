# Architecture

---

## Repository structure

```text
studybuddy/
├── .github/
│   └── workflows/
│       ├── ci.yml                # GitHub Actions CI pipeline (Ruff + migration-drift check + Pytest + pgvector job + ESLint + Vitest + build + dependency audits)
│       └── keepalive.yml         # Wakes the Render free instance every 10 minutes
├── docs/                         # Everything behind the root README (this folder)
│   ├── README.md                 # Index
│   ├── getting-started.md        # Setup, .env reference, Docker stack
│   ├── features.md               # Capability deep dive
│   ├── architecture.md           # This page
│   ├── api.md                    # Endpoint reference
│   ├── deployment.md             # Render + Neon + Vercel
│   ├── performance.md            # "By the numbers"
│   ├── quality.md                # Test suites + CI
│   └── assets/                   # A sample document to try document grounding with
├── frontend/                     # React + Tailwind CSS UI (Vite)
│   ├── index.html                # Vite entry document
│   ├── vite.config.mjs           # Vite + Vitest config, dev proxy for /api
│   ├── eslint.config.mjs         # ESLint 9 flat config (react, react-hooks, jsx-a11y subset)
│   ├── vercel.json               # Vercel build + /api rewrite to the Render API
│   ├── src/
│   │   ├── main.jsx              # Entry point
│   │   ├── App.jsx               # Routing (lazy route chunks) & React Query provider
│   │   ├── components/           # Layout (collapsible sidebar / mobile dropdown), PageHeader, Card,
│   │   │   │                     # Button, Input, LoadingSkeleton, ToolHistory, ErrorBoundary, CopyButton
│   │   │   ├── chat/             # SessionSidebar, SessionRow, MessageBubble, TypingIndicator, FollowUpChips
│   │   │   ├── studio/           # All-in-One Studio sections
│   │   │   ├── flashcards/       # ReviewSession (spaced-repetition review UI)
│   │   │   ├── shared/           # ChatBubble, Flashcard, QuizQuestionCard, QuizResults, ScoreCard,
│   │   │   │                     # DocumentPicker + DocumentSources + GroundingNote (grounding panel
│   │   │   │                     # reused by every tool page)
│   │   │   └── home/             # HomeDashboard (signed-in face), HomeLanding (visitor face),
│   │   │                         # Sparkline + ProgressRing (hand-rolled SVG, no chart lib)
│   │   ├── hooks/                # useChat (streaming + sessions), useStudio, useAutoScroll
│   │   ├── pages/                # Home, All, Explain, Summarize, Quiz, Flashcards, Chat, Login, Register
│   │   ├── context/              # AuthContext (JWT or cookie session), DocumentLibraryContext
│   │   ├── utils/                # api.js (explicit resource client + rejectionMessage()), session.js
│   │   │                         # (token / cookie-mode session state), routeColors, clipboard,
│   │   │                         # personalize.js, pendingTopic.js
│   │   ├── index.css             # Tailwind directives & menu / button / icon component classes
│   │   └── setupTests.js         # Vitest + Testing Library setup
│   ├── .dockerignore             # Keeps node_modules / build / .env out of the image build context
│   └── package.json
│
├── backend/                      # Django REST Framework API
│   ├── studybuddy/               # Project config (settings.py, urls.py, wsgi.py)
│   ├── study_api/                # API surface
│   │   ├── views.py              # Generate / chat / document / library endpoints
│   │   ├── auth_views.py         # Register, login, refresh, logout (token and cookie modes)
│   │   ├── cookie_auth.py        # httpOnly cookie sessions + CSRF header check (opt-in)
│   │   ├── generation.py         # Grounding (_ground_documents), prompt assembly, response cache, per-tool responses
│   │   ├── prompts.py            # System prompts
│   │   ├── dispatchers.py        # Shared action handlers (usage, generations, RAG, suggestions)
│   │   ├── langchain_client.py   # LangChain/Groq client (text, JSON, streaming, structured output)
│   │   ├── rag_pipeline.py       # RAG: extraction, chunking, Gemini embeddings, retrieval, grounded answers
│   │   ├── ingestion.py          # Durable DB-backed ingestion queue (claims, retries, reaper, worker)
│   │   ├── content_fetcher.py    # URL -> clean markdown (Firecrawl or built-in scraper); SSRF-guarded
│   │   ├── srs.py                # SM-2 variant scheduler for flashcard review
│   │   ├── review_views.py       # /flashcards/review/ endpoints
│   │   ├── models.py             # ChatSession, ChatMessage, Generation, Document, DocumentChunk, DocumentUpload, CardReview
│   │   ├── schemas.py            # Pydantic schemas for structured output
│   │   ├── serializers.py        # DRF serializers
│   │   ├── signals.py            # post_save hook on User -> admin signup notification
│   │   ├── signup_notifications.py
│   │   ├── throttles.py          # Per-scope rate limits (incl. AuthRateThrottle)
│   │   ├── management/commands/  # process_ingest_queue, reindex_documents
│   │   └── tests/                # Pytest suite (17 modules)
│   ├── build.sh                  # Render build: runtime-only install -> migration-drift check -> collectstatic -> migrate
│   ├── manage.py
│   ├── pytest.ini
│   ├── requirements.txt          # Runtime-only install used by build.sh
│   ├── requirements-dev.txt      # pytest / ruff / type stubs — CI and local dev only, never deployed
│   ├── .env.example              # Placeholder env template — copy to .env and fill in
│   ├── .dockerignore             # Keeps venv / .env / sqlite out of the image build context
│   └── .env                      # Local env vars (gitignored — never commit)
│
├── docker-compose.yml            # Local 3-service stack: pgvector db + gunicorn backend + nginx SPA
├── render.yaml                   # Render Blueprint (Infrastructure-as-Code)
└── README.md
```

---

## The request path

```text
 Browser (Vercel SPA)            Django REST API (Render · gunicorn)              Providers & Data
  ┌────────────────────┐          ┌──────────────────────────────┐            ┌────────────────────┐
  │ React · Tailwind   │  JSON    │ auth · throttles · budget    │   Groq      │ openai/gpt-oss-120b│
  │ React Query (cache)│◀────────▶│ GenerateView · ChatStreamView│◀──────────▶│ langchain-groq      │
  │ DocumentPicker     │   SSE    │ _ground_documents()          │            └────────────────────┘
  └────────────────────┘          │        │                     │            ┌────────────────────┐
                                  │        ▼                     │            │ Gemini Embedding 2│
                                  │ rag_pipeline (chunk→embed)   │───────────▶│ 768-dim vectors     │
                                  │ content_fetcher (SSRF guard) │            └────────────────────┘
                                  │        ▼                     │            ┌────────────────────┐
                                  │ Neon Postgres                │◀───────────│ pgvector + cache    │
                                  │ generations · docs · cache   │            └────────────────────┘
                                  └──────────────────────────────┘
```

### A generation, step by step

1. `POST /api/generate/` — DRF authenticates the bearer token, then the view's
   `throttle_scope` (`generate`) applies, then `enforce_daily_token_limit()` refuses
   the request with **429** if the day's budget is already spent. All of that happens
   **before** any provider call.
2. `langchain_client.reset_last_usage()` clears the per-request token counter.
3. `generation._ground_documents(user, document_ids, query)` runs **once**, for every tool
   type — it is the only grounding entry point (see below).
4. `content_fetcher.process_topic_with_url()` decides whether the input is a URL at
   all. Plain-text topics go straight to Groq; only URL-type topics are scraped.
5. The prompt is expanded (tool instructions + any web content + any grounded
   excerpts) and handed to `_cached_json_response()`, which looks the response up by
   `tool prefix + md5(fully expanded prompt)`.
6. On a miss, the model call runs (Groq, via `langchain_client`), the result is
   persisted as a `Generation` row with the provider's token counts and priced cost,
   and the response is cached with its `sources` merged in.
7. `take_last_usage()` is read **once** — the ContextVar is cleared on read — and the
   counts are stored on the `Generation` row.

---

## Document grounding: one path, not six

Grounding is a property of the **request**, not of the tool, so there is exactly one
implementation:

```text
generation._ground_documents(user, document_ids, query)
        │
        ├─ dispatchers.ready_document_ids(user, requested)   ← owner + status='ready'
        │        (a foreign or still-ingesting id is a 400, before any LLM call)
        │
        └─ rag_pipeline.retrieve_chunks()  →  rag_pipeline._build_rag_context()
                    │
                    ├─ pgvector retrieval (when the `vector` extension exists)
                    └─ numpy cosine-similarity fallback (in-process, identical behaviour)
```

The resulting context is folded into the prompt by `_with_docs()` **before**
`_cached_json_response()` computes its key — so the cache is document-set aware and a
different selection can never replay another library's answer. `_with_docs()` also
adds the abstain instruction (`DOCS_PREAMBLE` in `generation.py`); `_grounded_chat_system()`
is its chat-shaped counterpart. Sources are merged into the payload **before**
`cache.set`, so a reopened history still shows which documents answered it.

`ChatStreamView` calls the same helper **before** the generator starts and returns
the error `Response` instead of streaming, because a stream that has already sent
headers cannot fail cleanly.

### The 25-document cap

`dispatchers.MAX_DOCUMENT_SELECTION = 25` is the backend source of truth;
`GenerateSerializer`/`ChatSerializer` (`max_length`) and the frontend's
`MAX_SELECTED_DOCS` mirror it. `_action_rag_query` refuses an explicit selection
longer than the cap **before** parsing the ids or running any ownership lookup.
**Omitting** `document_ids` still searches every ready document the caller owns — the
cap limits one selection, never the library.

---

## The cache key

```text
key = "<tool prefix>" + md5(fully expanded prompt)
```

The expanded prompt contains the tool instructions, **any fetched web content**, and
**any grounded document excerpts**. That is what makes a cached payload safe to
replay: it embeds one owner's sources and titles, so two accounts that upload the
same file must not share a response. Ungrounded prompts stay shared across accounts —
that dedup is what saves provider money.

A cache hit bills **0 input / 0 output tokens**, because no provider call happens.
That is why `reset_last_usage()` exists: `--noreload` dev servers reuse worker
threads, and a stale counter would be written onto the cached row.

---

## Cost and abuse layers

| Layer | Where | Effect |
|-------|-------|--------|
| Daily token budget | `enforce_daily_token_limit()` before every model call | 429 with a plain-language message once `USER_TOKEN_LIMIT` is spent (default 10,000/day; `0` disables) |
| Per-scope throttles | `throttles.py` | anon `60/h`, user `300/h`, generate `60/h`, rag `40/h`, chat `90/h` — the expensive routes trip before the global ceiling |
| Response cache | `_cached_json_response()` | An identical prompt costs no tokens at all |
| Bounded RAG context | `RAG_TOP_K=5` × `RAG_CHUNK_SIZE=800`, each chunk truncated to 1,500 chars | At most ~4,000 characters of retrieved source text per answer |
| Max output tokens | 800 default, 600 for chat | Caps the billed output of any single generation |
| Provider timeout & retries | `request_timeout=30.0`, `max_retries=0` | A stalled provider errors out in 30 s instead of pinning a gunicorn thread until `--timeout 120` kills the worker |

The budget is enforced *before* the call, never after it, so a request can overshoot
by at most one call — a call's cost is unknown until it runs.

---

## The SSRF guard

`backend/study_api/content_fetcher.py` blocks internal targets at three layers:

1. `_is_safe_url()` — scheme allowlist, domain/path blocklist, and the optional
   `settings.ALLOWED_SCRAPE_DOMAINS` suffix allowlist.
2. `_host_is_public()` — resolves the hostname and requires **every** DNS answer to be
   a global IP. This defeats DNS rebinding, encoded IPs and cloud metadata addresses.
3. `_safe_get()` — follows redirects manually (max 3 hops), re-running `_is_safe_url()`
   and `_host_is_public()` on **every hop** before connecting. `allow_redirects=True`
   is never used on a user-supplied URL.

The URL gate itself is a single place: `process_topic_with_url()` decides whether
input gets scraped at all, so plain-text topics never reach Firecrawl or the direct
scraper.
