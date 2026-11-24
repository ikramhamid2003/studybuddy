# Getting Started

Two ways to run StudyBuddy locally: the **one-command Docker stack** (mirrors the
deployed topology) or the **manual setup** (hot-reloading dev servers). Both need the
same API keys.

---

## Prerequisites

- **Python 3.12+** — the backend
- **Node.js 24.x** — the frontend (`frontend/package.json` pins `engines.node: 24.x`)
- **A PostgreSQL database** — the easiest free option is [Neon](https://neon.tech). Optional for the manual setup: without `DATABASE_URL` the backend falls back to `backend/db.sqlite3`.
- **A Groq API key** from [console.groq.com](https://console.groq.com) — answer generation
- **A Gemini API key** from [aistudio.google.com](https://aistudio.google.com/app/apikey) — RAG embeddings
- **Optional:** a Firecrawl API key from [firecrawl.dev](https://www.firecrawl.dev) — cleaner URL scraping (a built-in scraper is used without it)
- **Optional:** Docker Desktop (Windows/macOS) or Docker Engine + Compose v2 (Linux) — for the stack below

---

## 1. Configuration

Copy the template and fill in the two required keys:

```bash
cp backend/.env.example backend/.env
```

`backend/.env` is gitignored and must never be committed. The template is
[`backend/.env.example`](../backend/.env.example); the reference for every key is
below.

> `_env_bool()` reads a present-but-empty value as **false**, so a boolean key must be
> left *commented out* in your `.env` — writing `KEY=` (empty) flips it off silently.

### `.env` reference

| Variable | Required | Default | What it does |
|----------|----------|---------|--------------|
| `GROQ_API_KEY` | **yes** | — | Groq key. Every answer is generated with it. |
| `GEMINI_API_KEY` | **yes** | — | Gemini key used for document embeddings. |
| `GROQ_MODEL` | no | `openai/gpt-oss-120b` | The generation model. Account-scoped — if a call fails with `model_not_found`, list what your key can use at `https://api.groq.com/openai/v1/models`. |
| `GROQ_PRICE_PER_M_INPUT` / `GROQ_PRICE_PER_M_OUTPUT` | no | `0` | USD per million tokens for `GROQ_MODEL`. While unset, `/api/usage/` records real token counts but reports a cost of `0.0000` rather than a guessed rate. |
| `USER_TOKEN_LIMIT` | no | `10000` | Per-user daily token budget (input + output, all tools + streamed chat). `0` disables the cap. Requests are refused with **429** once spent; the count resets at midnight UTC. |
| `THROTTLE_ANON_RATE` | no | `60/hour` | Anonymous callers. |
| `THROTTLE_USER_RATE` | no | `300/hour` | Signed-in callers, global bucket. |
| `THROTTLE_GENERATE_RATE` | no | `60/hour` | `/api/generate/` only — the heaviest route. |
| `THROTTLE_RAG_RATE` | no | `40/hour` | `/api/rag/upload/` and `/api/rag/query/`. |
| `THROTTLE_CHAT_RATE` | no | `90/hour` | `/api/chat/stream/`. |
| `DATABASE_URL` | no | sqlite file | Postgres/Neon connection string. Any Postgres URL is forced onto TLS by default. |
| `DB_SSL_REQUIRE` | no | on for Postgres | Set to `false` only for a local Postgres built without SSL. sqlite URLs ignore it — their driver rejects connection `OPTIONS`. |
| `SECRET_KEY` | no | insecure dev default | Any long random string. A deployment must set its own. |
| `DEBUG` | no | `False` | Local `.env` sets `True`. A deployment that leaves it on answers failed requests with tracebacks that dump settings. |
| `FIRECRAWL_API_KEY` | no | — | Clean URL scraping. Without it the built-in requests/BeautifulSoup scraper is used, and any Firecrawl failure falls back to it automatically. |
| `ALLOWED_SCRAPE_DOMAINS` | no | `""` (no extra restriction) | Comma-separated hostname allowlist, suffix-matched — `edu` admits `mit.edu` and `cs.mit.edu`. |
| `RAG_EMBED_MODEL` | no | `gemini-embedding-2` | Embedding model. Changing it (or the dimension) **requires re-indexing every uploaded document**. |
| `RAG_EMBED_DIMENSIONS` | no | `768` | Embedding width. Same re-indexing requirement. |
| `RAG_CHUNK_SIZE` | no | `800` | Characters per chunk. |
| `RAG_CHUNK_OVERLAP` | no | `150` | Chunk overlap (18.75% of the chunk) so answers straddling a boundary are not missed. |
| `RAG_TOP_K` | no | `5` | Chunks retrieved per query. |
| `RAG_MAX_UPLOAD_MB` | no | `20` | Upload size ceiling. |
| `RAG_MAX_DOCUMENTS_PER_USER` | no | `25` | Documents one account may keep; further uploads get a 409. `0` disables. |
| `RAG_MAX_CHUNKS_PER_DOCUMENT` | no | `2000` | Sections one document may produce; larger files fail before any embedding call. `0` disables. |
| `RAG_MAX_CHUNKS_PER_USER` | no | `10000` | Total indexed sections per account. `0` disables. |
| `SIGNUP_NOTIFICATION_EMAIL` | no | `""` (feature off) | Recipient for the signup-notification email. Filling this one value activates the feature. |
| `DEFAULT_FROM_EMAIL` | no | — | Must equal `EMAIL_HOST_USER` for Gmail, or the send is rejected. |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` / `EMAIL_USE_TLS` | no | `smtp.gmail.com` / `587` / — / — / `true` | SMTP transport. Gmail needs a **16-character App Password**, not the account password. |
| `EMAIL_TIMEOUT` | no | `5` | Seconds. Bounds an unresponsive SMTP host — without it `smtplib` blocks on the OS TCP timeout (21 s on Windows, minutes on Linux). |
| `GLITCHTIP_DSN` | no | — | GlitchTip (Sentry-compatible) DSN. Empty disables error tracking. |

---

## 2. Manual setup (hot reload)

### Backend

```bash
cd backend

python -m venv venv
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows

pip install -r requirements-dev.txt   # runtime set + pytest/ruff/type stubs

python manage.py migrate
python manage.py createcachetable
python manage.py runserver
```

The API runs at **`http://localhost:8000`**.

> **Notes**
> - The Pytest suite does **not** need a real database — tests switch to SQLite (`db_test.sqlite3`). One exception: the pgvector branch of `retrieve_chunks()` cannot run on SQLite, so CI sets `TEST_DATABASE_URL` to a Postgres + pgvector service for that job only.
> - `ALLOWED_HOSTS` defaults to `localhost,127.0.0.1,.onrender.com`, so local development needs nothing extra. If you set it yourself, include `127.0.0.1` — otherwise Django rejects every local request with `DisallowedHost` (HTTP 400).
> - Locally the dev server is always launched with `--noreload`, so an edit never reaches an already-running server: **restart it** before judging a backend change through HTTP.

### Frontend

```bash
cd frontend
npm install
npm start
```

The app runs at **`http://localhost:3000`** and calls `http://localhost:8000/api` by
default. Point it elsewhere with `REACT_APP_API_URL` (in `.env` for dev,
`.env.production` for builds) — for example, at the deployed API:
`REACT_APP_API_URL=https://studybuddy-api-hkgx.onrender.com/api`.

---

## 3. Docker quickstart (one command)

Everything above works without Docker. If you would rather not install Python and
Node locally, the Compose file brings the whole stack up with one command — it
mirrors the deployed topology (gunicorn + nginx + Postgres) rather than the
hot-reloading dev servers.

### Prerequisites
- **Docker Desktop** (Windows/macOS) or **Docker Engine + Compose v2** (Linux).
- A **`backend/.env`** file. Compose reads it through `env_file:`, and it is gitignored, so a fresh clone has none — copy `backend/.env.example` to `backend/.env` and add at least `GROQ_API_KEY` and `GEMINI_API_KEY`. Without it the stack refuses to start.

### Run it

```bash
# From the repository root
docker compose up --build
```

| Service | What it is | Notes |
|---------|------------|-------|
| `db` | `pgvector/pgvector:pg16` | The `vector` extension is created by an init script on first boot, so the **pgvector** retrieval path is exercised locally — not the numpy fallback. It publishes **no host port**; only the backend talks to it. Data lives in the `postgres_data` volume. |
| `backend` | `python:3.12-slim` + gunicorn | Runtime-only dependencies (the same `requirements.txt` Render installs), a non-root user, and gunicorn configured exactly like `render.yaml`: **1 worker, 4 threads, 120 s timeout**. On boot it runs the **migration-drift check** (`makemigrations --check`), then `migrate`, `createcachetable` and `collectstatic`. Health-checked at `/api/health/`. |
| `frontend` | `node:24` build served by `nginx:1.28-alpine` | The SPA is built with `REACT_APP_API_URL=/api` and nginx proxies `/api/` to the backend. `proxy_buffering off` keeps **streamed chat streaming** instead of buffering it, and `client_max_body_size 21m` covers the 20 MB (`RAG_MAX_UPLOAD_MB`) document upload. |

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

## 4. Something to try

Upload [`assets/sample-notes.txt`](assets/sample-notes.txt) from any tool page (or
`POST /api/rag/upload/`), wait for the status to turn **ready**, tick the document in
the **My documents** picker, and run any tool. The answer comes back with a
**SOURCES** citation back to the file.

Re-index every document after changing the embedding model or its dimension:

```bash
cd backend
python manage.py reindex_documents
```
