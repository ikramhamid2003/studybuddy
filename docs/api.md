# API Reference

The frontend uses explicit resource endpoints. Authentication routes are public;
generation, chat, history, usage, and RAG routes require a JWT bearer token.

The live schema is browsable at **`/api/docs/`** (Swagger UI) and machine-readable at
**`/api/schema/`** (OpenAPI 3).

---

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register/` | Public | Create a new user account |
| `POST` | `/api/auth/login/` | Public | Obtain JWT access + refresh tokens |
| `POST` | `/api/auth/refresh/` | Public | Exchange a refresh token for a new access token |
| `GET` | `/api/auth/me/` | JWT | Return the signed-in user's `id` and `username`; recovers the handle for tokens issued before the `username` claim existed |
| `POST` | `/api/auth/logout/` | Public | Revoke the refresh token (cookie or body) and clear the session cookies; always `204` |
| `POST` | `/api/token/blacklist/` | Public | Revoke a refresh token (legacy logout) |

### The token flow

- `POST /api/auth/login/` takes **`username`** and `password` (not email) and returns
  `{access, refresh, username}`. The `username` claim is embedded in the access token
  so the sidebar can name the signed-in student without an extra request.
- The access token lives 1 day, the refresh token 7 days. The frontend stores both in
  `localStorage` under `token` / `refresh` and refreshes silently on a 401.
- simplejwt **rotates** refresh tokens: the old one is blacklisted on use, so the new
  one must replace it or the next renewal fails. Concurrent 401s share one exchange.
- **Cookie sessions (opt-in).** A request that carries the header `X-StudyBuddy-Client`
  gets httpOnly cookies instead of tokens: `login` sets `sb_access` (path `/`) and
  `sb_refresh` (path `/api/auth/`), both `Secure; SameSite=Strict`, and answers
  `{user: {id, username}}`; `refresh` reads the refresh cookie and rotates both. Cookie
  requests that change state must also send that header (the CSRF defence). Requests
  without the header behave exactly as described above, so API clients are unaffected.
  The web client uses cookie mode when `REACT_APP_API_URL` is a relative path (`/api`),
  which needs the same-origin proxy in `frontend/vercel.json`.
- A token minted before the `username` claim existed self-heals through
  `GET /api/auth/me/`, so the handle appears without forcing a re-login.

---

## Study Tools & History

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/generate/` | JWT | Run any tool (`explain`, `summarize`, `quiz`, `flashcards`, `chat`) and persist the result; optional `document_ids` grounds it in the caller's ready documents and returns `sources` |
| `GET` | `/api/generations/` | JWT | List saved generations, newest first; optional `?type=` filter |
| `DELETE` | `/api/generations/<id>/` | JWT | Delete one saved generation owned by the caller |
| `GET` | `/api/usage/` | JWT | Return cumulative token usage and estimated cost |

---

## AI Chat Sessions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/chat/stream/` | JWT | Real-time SSE streaming chat (returns `text/event-stream`); optional `document_ids` grounds each turn and the closing `done` frame carries `sources` |
| `GET` | `/api/sessions/` | JWT | List chat sessions for the sidebar |
| `POST` | `/api/sessions/` | JWT | Create an empty chat session |
| `GET` | `/api/sessions/<id>/` | JWT | Fetch one session with its persisted messages |
| `PATCH` | `/api/sessions/<id>/` | JWT | Rename a chat session |
| `DELETE` | `/api/sessions/<id>/` | JWT | Delete a chat session and its messages |
| `GET` | `/api/sessions/<id>/suggestions/` | JWT | Fetch AI-suggested follow-up questions for a session |

### Streaming frames

`POST /api/chat/stream/` emits `text/event-stream` with three frame shapes:

```text
{"chunk": "..."}      # one token of the reply, repeated
{"done": true, "session_id": 12, "sources": [...]}
{"error": "..."}
```

The `done` frame carries the persisted session id and the documents that answered the
turn. A grounded failure is returned **before** the first frame — a stream that has
already sent headers cannot fail cleanly.

---

## Document RAG

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/rag/upload/` | JWT | Multipart document upload (`file`, optional `title`) |
| `GET` | `/api/rag/documents/` | JWT | List the caller's uploaded documents |
| `GET` | `/api/rag/documents/<id>/` | JWT | Poll document status (`pending`, `processing`, `ready`, `error`) |
| `DELETE` | `/api/rag/documents/<id>/` | JWT | Delete a document and its indexed chunks |
| `POST` | `/api/rag/query/` | JWT | Ask a question grounded in ready documents (endpoint of the retired Ask My Docs page; no longer called by the UI). An explicit `document_ids` list longer than 25 is refused with 400 `"document_ids must contain at most 25 document IDs."` before the ids are parsed or any ownership lookup runs; **omitting** the field searches every ready document the caller owns |

---

## System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health/` | Public | Service health check |
| `GET` | `/api/schema/` | Public | OpenAPI 3 schema (drf-spectacular) |
| `GET` | `/api/docs/` | Public | Swagger UI for every endpoint above |

---

## Error shapes

The API answers a rejected request with DRF's own body, and the frontend reads the
server's real reason out of it rather than showing a generic label. `rejectionMessage()`
in `frontend/src/utils/api.js` unwraps, in this order:

1. `error`
2. `detail`
3. the first nested reason — e.g. `{"document_ids": {"0": ["A valid integer is required."]}}`
4. the fallback `"<path> failed (HTTP <status>)"`

Recognised body shapes:

```json
{"topic": ["This field may not be blank."]}
{"non_field_errors": ["..."]}
{"document_ids": {"0": ["A valid integer is required."]}}
```

The helper is exported from `api.js` and shared by every explicit-endpoint call, so a
rejected signup, an over-long document selection and an offline dashboard all say what
actually went wrong.

### Status codes worth knowing

| Code | When |
|------|------|
| `400` | Validation failure, a `document_ids` list over the 25 cap, or a document that is not owned by the caller / not `ready` |
| `401` | Missing, expired or unrefreshable token |
| `429` | Daily token budget spent, or a throttle scope exceeded |
| `503` | Grounding failed (retrieval or embedding provider unavailable) — never degraded into an ungrounded answer |
