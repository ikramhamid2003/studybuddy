# Architecture

---

## Repository structure

```text
studybuddy/
├── .github/
│   └── workflows/
│       ├── ci.yml                # GitHub Actions CI pipeline (Ruff + migration-drift check + Pytest + pgvector job + ESLint + Jest)
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
│   └── assets/                   # Screenshots, the demo GIF, a sample document
├── frontend/                     # React + Tailwind CSS UI
│   ├── public/
│   ├── src/
│   │   ├── components/           # Layout (collapsible sidebar / mobile dropdown), PageHeader, Card,
│   │   │                         # Button, Input, LoadingSkeleton, ToolHistory, ErrorBoundary
│   │   ├── shared/               # ChatBubble, Flashcard, ScoreCard, SectionTitle, TypeBadge,
│   │   │                         # DocumentPicker + DocumentSources + GroundingNote (the grounding
│   │   │                         # panel reused by every tool page), the useDocumentLibrary() hook
│   │   │                         # behind them (+4-test ownership suite) and useGenerationAbort()
│   │   ├── home/                 # HomeDashboard (signed-in personalized face, +14-test
│   │   │                         # failure-semantics suite), HomeLanding (visitor
│   │   │                         # face), Sparkline + ProgressRing (hand-rolled SVG, no chart lib)
│   │   ├── pages/                # Home, All, Explain, Summarize, Quiz, Flashcards, Chat, Login, Register
│   │   ├── context/              # AuthContext for JWT session management (+7-test cache-teardown and
│   │   │                         # auth-rejection suite), DocumentLibraryContext
│   │   ├── utils/                # api.js (explicit resource client + the shared rejectionMessage()
│   │   │                         # error-reason extractor), api.test.js (46-test Jest suite),
│   │   │                         # routeColors, clipboard, personalize.js (+31-test suite) and
│   │   │                         # pendingTopic.js (home -> tool pre-fill hand-off)
│   │   ├── App.jsx               # Routing & React Query provider
│   │   ├── index.css             # Tailwind directives & menu / button / icon component classes
│   │   └── .dockerignore         # Keeps node_modules / build / .env out of the image build context
│   └── package.json
│
├── backend/                      # Django REST Framework API
│   ├── studybuddy/               # Project config (settings.py, urls.py, wsgi.py)
│   ├── study_api/                # API surface
│   │   ├── dispatchers.py        # Shared action handlers (usage, generations, RAG, suggestions)
│   │   ├── langchain_client.py   # LangChain/Groq client (text, JSON, streaming, structured output)
│   │   ├── rag_pipeline.py       # RAG: extraction, chunking, Gemini embeddings, retrieval, grounded answers
│   │   ├── content_fetcher.py    # URL -> clean markdown (Firecrawl when configured, built-in scraper otherwise); SSRF-guarded
│   │   ├── models.py             # ChatSession, ChatMessage, Generation, Document & DocumentChunk persistence
│   │   ├── schemas.py            # Pydantic schemas for structured output
│   │   ├── serializers.py        # DRF serializers (register, generate, chat, sessions)
│   │   ├── signals.py            # post_save hook on User -> admin signup notification email
│   │   ├── throttles.py          # Per-scope rate limits
│   │   └── tests/                # Pytest suite (views, generations, chat sessions, langchain client, RAG, content fetcher)
│   ├── build.sh                  # Render build: runtime-only install -> migration-drift check -> collectstatic -> migrate
│   ├── manage.py
│   ├── pytest.ini
│   ├── requirements.txt          # Runtime-only install used by build.sh
│   ├── requirements-dev.txt      # pytest / ruff / type stubs — CI and local dev only, never deployed
│   ├── .env.example              # Placeholder env template — copy to .env and fill in
│   ├── .dockerignore             # Keeps venv / .env / sqlite out of the image build context
│   └── .env                      # Local env vars (gitignored — never commit)
│
├── scripts/
│   └── capture/                  # Regenerates the README's screenshots and demo GIF from the deployed site
│       ├── capture.mjs           # Zero-dependency Chrome DevTools Protocol driver (Node 24+)
│       └── build-gif.sh          # ffmpeg command that turns the captured frames into demo.gif
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
3. `views._ground_documents(user, document_ids, query)` runs **once**, for every tool
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
views._ground_documents(user, document_ids, query)
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
adds the abstain instruction (`DOCS_PREAMBLE` in `views.py`); `_grounded_chat_system()`
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
