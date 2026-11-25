# Features

The root [README](../README.md) condenses these into eight one-line highlights. This
page is the long form.

---

## The five AI study tools

Each tool has its own saved history, and each one can be grounded in your own
documents.

- 🧠 **Explain Concept** — clear explanations tailored to Beginner, Intermediate or Advanced levels, with analogies and examples.
- 📝 **Summarize Notes** — condenses study material into concise summaries, key concepts, defined terms and study tips.
- ❓ **Quiz Generator** — customisable multiple-choice quizzes with an explanation for every correct answer.
- 🎴 **Flashcard Creator** — interactive 3D flip flashcards with hints and **Anki CSV export**.
- 💬 **AI Study Buddy Chat** — a multi-turn conversational tutor with **real-time word-by-word streaming (SSE)**, **persisted chat sessions** (create, rename, delete) stored in PostgreSQL, and optional document grounding with per-message citations.

## 🎛️ All-in-One Studio (`/all`)

Runs any tool with its full options in one place — including the **My documents**
grounding picker — filters the combined generation history by tool, and lets you reopen
or **delete** any saved result.

## 🏠 Adaptive Home (`/`), one route with two faces

Signed out, a landing page whose "try the router" demo runs the *real* `routeIntent`
keyword router — not a mock. Signed in, a personalized dashboard assembled only from
rows the API already returns: day streak, a 14-day activity sparkline, tool mix, an
onboarding checklist whose ticks are earned by real generations / sessions / documents,
next-step suggestions derived from your last topic, recent conversations, your document
library, and cumulative tokens + priced cost from `GET /api/usage/` (previously an
endpoint nothing consumed).

The hero focus box routes whatever you type to the matching tool and hands the text
over pre-filled through a one-shot `sessionStorage` hand-off. Every derived metric is a
pure function of `(rows, now)` in `frontend/src/utils/personalize.js`, unit-tested with
an injected clock, so no number on the page can be fabricated.

**A failed request is never dressed up as an empty account.** The dashboard
distinguishes *pending* from *empty* from *failed*: an offline endpoint raises a rose
alert banner naming each broken panel and its server message with a **Retry** button
that refetches only the failed queries, an unknown metric renders `—` instead of a
fabricated `0`, and the empty-state copy ("Nothing saved yet", "No saved conversations
yet", "Upload a PDF…") appears only after a successful load. Setup progress and
next-step suggestions stay hidden until generations, sessions and documents have all
arrived, because a checklist computed from half-loaded data is a lie.

## 📎 Ground any tool in your documents

The **My documents** picker is not confined to one page — Explain, Summarize, Quiz,
Flashcards, Chat **and** the All-in-One Studio each carry the same document panel, so
any generation can be grounded instead of answered from model memory.

A selection that fits inside a 24,000-character budget is fed to the prompt **whole**
(raw extracted text, no retrieval); anything larger or not yet extracted falls back to
**top-k retrieval** over the selected documents. Selected excerpts are folded into the
prompt with a "do not invent beyond these notes" preamble and the response comes back
with **SOURCES** citations. While a selection is active, each page also shows a
one-line note under its input — "The output will be based on the selected document(s)"
— which disappears entirely when nothing is picked
(`frontend/src/components/shared/GroundingNote.jsx`).

**Guards.** Document IDs must be owned by the caller *and* `ready` (a foreign or
still-ingesting ID is refused with 400 before any LLM call); a grounding failure aborts
with 400/503 rather than streaming or returning an ungrounded answer; the document set
is part of the cached prompt key, so two different libraries never share one response;
and one generation can cite at most **25 documents** — the picker refuses a 26th tick
(removals are always allowed) and trims a selection restored from storage, because
`GenerateSerializer`/`ChatSerializer` reject a longer `document_ids` list outright
rather than truncating it. The same limit is enforced by the backend on
`POST /api/rag/query/`: an explicit selection longer than 25 is refused with **400**
`"document_ids must contain at most 25 document IDs."` *before* the ids are parsed or
any ownership lookup runs, while **omitting** the field still searches every ready
owned document — the cap limits one selection, never the library.

## 📄 Document ingestion & retrieval

Upload **PDF, TXT or MD** files from any tool page. Uploads are stored in the database and
ingested from a durable queue, so a restart requeues the work (extract → chunk → embed with **Gemini Embedding 2**), retrieval runs
over **pgvector** on PostgreSQL with a seamless in-process numpy cosine-similarity
fallback, and answers are generated by **Groq** as plain text (no raw markdown) with
citations back to the source documents. The standalone **Ask My Docs** page (`/rag`)
was retired once every tool grounded itself from the shared selection; the `/api/rag/*`
endpoints remain (`upload`, `documents`, status polling, `delete`, and the `query`
endpoint the retired page used).

## 🌐 Firecrawl web scraping

Paste a URL into Explain, Summarize, Quiz, Flashcards or Chat and the page is scraped
with the **Firecrawl API** into clean markdown — JavaScript-rendered pages included —
then handed to **Groq** for the final answer. Plain-text topics skip scraping entirely
and go straight to **Groq**. If `FIRECRAWL_API_KEY` is not configured or a scrape
fails, a built-in requests/BeautifulSoup scraper takes over automatically.

Every fetch is **SSRF-guarded** (CWE-918): the URL scheme, blocklisted domains/paths and
the DNS-resolved IP are validated (loopback, private and link-local ranges — including
cloud metadata addresses — are refused, closing DNS-rebinding and encoded-IP
bypasses), and redirects are followed manually with every hop re-validated (max 3
hops). Setting the optional `ALLOWED_SCRAPE_DOMAINS` adds a third gate — a
comma-separated hostname allowlist matched by suffix, so `edu` admits `mit.edu` and
`cs.mit.edu`; with it unset, scraping stays open to every host that passes the SSRF
and blocklist checks.

## 🦜 LangChain integration

All LLM calls go through `langchain-groq` (`ChatGroq`) in
`backend/study_api/langchain_client.py` — plain text, JSON, SSE streaming, and
**structured output validated against Pydantic schemas** (Quiz & Flashcards).
Structured calls use JSON prompting with `JsonOutputParser` rather than native
tool-calling, so they also work on models that do not implement tools.

The client is built with a **30-second request timeout and `max_retries=0`**: a stalled
provider then surfaces as an error instead of pinning a gunicorn thread until the
worker is killed, and the SDK's own retries cannot multiply the structured-output
fallback — that path makes at most **two** attempts (tool-calling, then JSON
prompting), which is exactly what the test suite asserts.

## ⚡ Groq LLM API

Fast, low-latency Groq models — `openai/gpt-oss-120b` by default, overridable with
`GROQ_MODEL`.

## 💾 Database request caching

Identical LLM requests are cached in Django for 7 days (`studybuddy_cache` table),
eliminating duplicate API costs and serving instant responses. The four JSON tools
participate — keyed on the fully-expanded prompt (including any fetched web content
and any grounded document excerpts) so changed options or a different document set
never share a response — while live chat (history-dependent) and RAG queries (grounded
in a changing document set) are never cached. Failed LLM calls are never cached.

## 🔄 React Query integration

Efficient frontend data fetching, caching and mutation state management; history and
session lists invalidate automatically after a generate, rename or delete — including
the dashboard keys (`generations`, `chat_sessions`, `usage_stats`) that a tool page's
mutation used to leave stale inside their 60-second `staleTime`, so the budget meter
could keep showing the spend from before the turn.

Losing the token — logout, a refused refresh, or a token this build can no longer
decode — clears the whole query cache and drops the previous account's document
selection, so the next student on the same browser never reads the last one's data out
of memory.

## 🛑 Walk-away cancellation

Every tool page and the chat stream runs its request on an `AbortController` that fires
when you navigate away, start a new chat, or switch sessions. A reply you abandoned can
no longer append its remaining tokens into whichever transcript is on screen by then,
and an abandoned **streamed chat turn also ends at the server**, so the rest of it is
neither generated nor billed (a non-streaming `/api/generate/` call still runs to
completion server-side — the abort cancels the client's wait, not the provider's). An
abort is never reported as a failure: no error toast, and an unfinished reply is not
marked complete. `frontend/src/components/shared/generationAbort.js` owns the pattern.

## 📱 Responsive UI

A desktop sidebar that collapses to an icon rail, a chat session rail that collapses
the same way, and both becoming a dropdown menu / slide-over drawer on smaller
screens.

## 🔐 Session & security

JWT authentication (`rest_framework_simplejwt`, 1-day access / 7-day refresh tokens,
with the `username` embedded in the token payload so the sidebar can name the
signed-in student) with automatic bearer-token injection, anonymous rate limiting
(60 req/hour) on the API, and SSRF-hardened URL fetching (resolved-IP validation +
per-hop redirect re-checks). Sessions whose access token predates the `username` claim
self-heal via `GET /api/auth/me/`, so the sidebar shows the real handle without forcing
a re-login.

## 🧮 Token & cost tracking

`langchain_client.py` reads each response's provider-reported token counts into a
per-request `ContextVar` (`_record_usage` / `take_last_usage`), and `GenerateView`
writes them onto the `Generation` row — `input_tokens`, `output_tokens`, and `cost`
from the per-million rates in `settings.GROQ_PRICE_PER_M_INPUT` / `_OUTPUT` — which
`GET /api/usage/` then aggregates.

Measured 2026-10-16 through the live HTTP path: a cold `explain` recorded **209 in /
477 out**, and the identical repeat (a response-cache hit) recorded **0 / 0** while
returning the same payload, because it never reaches the provider. Cost reads `0.0000`
until both price variables are set for the configured model — an honest zero rather
than a guessed rate.

## 🚦 Per-user daily token budget

Each account gets a daily allowance (`USER_TOKEN_LIMIT`, default **10,000** tokens,
`0` disables it). `tokens_used_today` sums the day's `Generation` and `UsageLog`
tokens — and streamed chat writes a `UsageLog` row so it counts too, closing the gap
where only `/api/generate/` was metered.

`GenerateView` and `ChatStreamView` call `enforce_daily_token_limit` **before** any
model call and return **429** with a plain-language message once the budget is spent (a
request can overshoot by at most one call, since a call's cost is unknown until it
runs). A stream the reader abandons mid-reply still counts: `ChatStreamView` records
the turn in a `finally`, because a disconnect arrives as `GeneratorExit` — which the
ordinary error handler cannot catch — and unrecorded tokens would make the cap
bypassable by simply closing the tab.

`GET /api/usage/` additionally returns `daily_token_limit`, `tokens_used_today` and
`tokens_remaining_today`, which the dashboard renders as a "Daily token budget" meter
that turns amber near the cap and rose when spent.

## 📊 Telemetry & error tracking

Vercel Analytics & Speed Insights for Core Web Vitals, and **GlitchTip**
(Sentry-compatible) error tracking on both frontend (`@sentry/react` with session
replay) and backend (`sentry-sdk` Django integration).

## 🔎 Server-reported error reasons

The API client (`frontend/src/utils/api.js`) extracts the server's own reason out of a
DRF error body instead of showing a generic label — field arrays
(`{"topic": ["This field may not be blank."]}`), `non_field_errors`, and nested
dictionaries such as `{"document_ids": {"0": ["A valid integer is required."]}}` are
all unwrapped, with the precedence `error` → `detail` → first nested reason →
`"<path> failed (HTTP <status>)"`. The helper (`rejectionMessage`) is exported from
`api.js` and shared by every explicit-endpoint call, so a rejected signup, an over-long
document selection and an offline dashboard all say what actually went wrong.

## 🐳 Local Docker stack (optional)

`docker compose up --build` brings up the whole app without a local Python or Node
install — **pgvector Postgres** (the `vector` extension is created by an init script,
and the database publishes no host port), the **Django backend** on `python:3.12-slim`
running gunicorn with the same flags as Render (1 worker, 4 threads, 120 s timeout) and
performing its migration-drift check, `migrate`, `createcachetable` and `collectstatic`
on boot, and an **nginx-served React build** that proxies `/api/` to the backend with
proxy buffering disabled so streamed chat still streams. Both ports bind to
`127.0.0.1` only. See [Getting started](getting-started.md).

## 🛡️ Quality gates

Ruff Python linter, a **195-test Pytest suite**, ESLint, and **181 Vitest tests** in 20
suites — all enforced in **GitHub Actions CI/CD**, which also checks for unmigrated
model changes and runs the pgvector retrieval SQL against a real Postgres. See
[Quality](quality.md).
