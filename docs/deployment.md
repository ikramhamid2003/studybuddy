# Deployment

Production is **Render** (backend) + **Neon** (PostgreSQL) + **Vercel** (frontend).
[`docker-compose.yml`](../docker-compose.yml) is the *local* mirror of the Render
topology — the same gunicorn flags (1 worker, 4 threads, 120 s timeout) and the same
`/api/health/` probe — so a local run behaves like the deployed service. **The Compose
stack is not a deployment path.**

---

## Backend (Render + Neon)

1. Create a free PostgreSQL database on [Neon](https://neon.tech) and copy its connection string.
2. Go to your [Render Dashboard](https://dashboard.render.com/) → **New +** > **Blueprint** and connect this repository — [`render.yaml`](../render.yaml) defines the Django web service (gunicorn + WhiteNoise, health check at `/api/health/`).
3. In the service's Environment settings, set `DATABASE_URL` to your Neon connection string, `GROQ_API_KEY` to your Groq key, and `GEMINI_API_KEY` to your Gemini API key for RAG embeddings (all three are declared `sync: false` in the Blueprint).
4. Optionally set `GROQ_MODEL` if you want a model other than the `openai/gpt-oss-120b` default. Render's environment overrides the code default, so if you set it here you must keep it in sync with the model your Groq key can actually use.
5. Every deploy runs [`backend/build.sh`](../backend/build.sh): it installs `requirements.txt` (runtime only — pytest, ruff and the type stubs live in `requirements-dev.txt` and never reach the image), then fails the build if `makemigrations --check --dry-run` finds a model with no migration, and only then runs `collectstatic`, `createcachetable` and `migrate`. The same drift check is a CI step, so an unmigrated model is caught before it can be deployed. To unwind a bad migration, use the Render shell: `python manage.py migrate study_api <previous_migration_name>` (also recorded in `build.sh`).

> **Note:** the Groq model is account-scoped. If `generate` or `chat_stream` returns a
> `model_not_found` error, list the models your key can use with
> `GET https://api.groq.com/openai/v1/models` and set `GROQ_MODEL` accordingly — the
> model catalogue changes over time.

> **Optional — faster RAG retrieval:** with a PostgreSQL/Neon database the pipeline uses
> pgvector when the `vector` extension exists and otherwise falls back to in-process
> numpy cosine similarity automatically. To enable the pgvector path, run
> `CREATE EXTENSION IF NOT EXISTS vector;` once against your database (Neon SQL editor or
> Render shell). Both paths read the same stored embeddings, so no re-indexing is needed
> — and if your Postgres user cannot create extensions, RAG still works via the fallback.

> **Optional — better URL scraping:** set `FIRECRAWL_API_KEY` (declared `sync: false` in
> the Blueprint) to scrape URLs with Firecrawl for clean, JS-rendered markdown. Without
> it, the built-in requests/BeautifulSoup scraper is used, and any Firecrawl failure
> falls back to it automatically.

> **Signup notification emails are local-only, by decision:** Render blocks outbound
> traffic to SMTP ports **25, 465 and 587 on free web services**, so
> `EMAIL_HOST=smtp.gmail.com:587` can never connect from the deployment however
> carefully the four `sync: false` values (`SIGNUP_NOTIFICATION_EMAIL`,
> `DEFAULT_FROM_EMAIL`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`) are entered in its
> dashboard. Do not spend time debugging that as a code fault. The Blueprint still pins
> `EMAIL_HOST=smtp.gmail.com`, `EMAIL_PORT=587`, `EMAIL_USE_TLS=true` as literals, and
> `SIGNUP_NOTIFICATION_EMAIL` empty keeps the feature off locally too. A *skipped* send
> logs nothing, but a *failed* one is not invisible: `settings.py` defines no `LOGGING`
> block, so Python's `logging.lastResort` writes `Could not send signup notification for
> user …` plus the traceback to stderr — which is exactly what Render's log stream
> shows, and the line's absence is what proves the recipient is empty. A stalled send is
> capped by `EMAIL_TIMEOUT` (5 s default). Delivering from production would mean
> upgrading the Render instance, or sending over HTTPS on port 443 (not blocked) through
> a transactional provider.

> **The free instance sleeps:** Render's free web services spin down after 15 minutes
> without traffic, so a scheduled workflow (`Keep API Warm`,
> `.github/workflows/keepalive.yml`) pings `/api/health/` to wake it. That ping is
> deliberately tolerant — it waits out a cold start and reports a non-200 as a warning
> rather than failing the job, because a slow start is not a deployment failure.

---

## Frontend (Vercel)

1. Connect the `frontend/` directory to Vercel.
2. Set `REACT_APP_API_URL` to your deployed Render backend URL, and optionally `REACT_APP_GLITCHTIP_DSN` for frontend error tracking.

   **Optional: keep login tokens out of JavaScript.** With an absolute API URL the app
   stores its tokens in `localStorage`, where any injected script could read them.
   Setting `REACT_APP_API_URL=/api` switches the app to httpOnly cookie sessions: the
   rewrite in `frontend/vercel.json` forwards `/api/*` to the Render backend, so the
   cookie is first-party and works in Safari and Firefox. Edit the rewrite's destination
   if your backend URL differs, redeploy, and check sign-in, chat streaming and a PDF
   upload on the preview first. Users sign in once more after the switch.
3. Deploy! Any `*.vercel.app` origin is automatically allowed by the backend's CORS config.

---

## The environment keys the Blueprint expects

| Key | `sync: false` | Meaning |
|-----|---------------|---------|
| `DATABASE_URL` | yes | Neon/Postgres connection string |
| `SECRET_KEY` | no (`generateValue: true`) | Django secret key |
| `DEBUG` | no (`"False"`) | Never on in production |
| `ALLOWED_HOSTS` | no (`studybuddy-api-hkgx.onrender.com,.onrender.com`) | Host allowlist |
| `CORS_ALLOWED_ORIGINS` | no (`https://studybuddy-omega-gray.vercel.app`) | Browser origins allowed to call the API |
| `CSRF_TRUSTED_ORIGINS` | no (`https://*.vercel.app,https://*.onrender.com`) | CSRF trust |
| `GROQ_API_KEY` | yes | Answer generation |
| `GEMINI_API_KEY` | yes | RAG embeddings |
| `FIRECRAWL_API_KEY` | yes | Optional — URL scraping |
| `SIGNUP_NOTIFICATION_EMAIL` | yes | Optional — signup notification recipient |
| `DEFAULT_FROM_EMAIL` | yes | Optional — SMTP sender |
| `EMAIL_HOST_USER` | yes | Optional — SMTP username |
| `EMAIL_HOST_PASSWORD` | yes | Optional — SMTP password / App Password |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USE_TLS` | no (literals) | `smtp.gmail.com` / `587` / `true` |

The full key reference (including the keys that live only in `backend/.env` locally)
is in [Getting started](getting-started.md).

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Backend exits immediately after deploy | The migration-drift check found a model change with no migration | `python manage.py makemigrations` locally and commit the result |
| `model_not_found` from generate / chat_stream | The configured model is not available to your Groq key | `GET https://api.groq.com/openai/v1/models` and set `GROQ_MODEL` |
| First request takes ~60 s | Render free tier cold start | Expected; the keep-alive workflow pings every 10 minutes |
| `DisallowedHost` (400) on a local request | `ALLOWED_HOSTS` was overridden without `127.0.0.1` | Include `127.0.0.1` in the value |
| A request answers 429 with a budget message | The account's daily token allowance is spent | Wait for the UTC day rollover, or raise `USER_TOKEN_LIMIT` |
| `Could not send signup notification for user …` in the logs | `SIGNUP_NOTIFICATION_EMAIL` is set but SMTP cannot be reached (the free tier blocks ports 25/465/587) | Expected on Render free; deliver locally or via an HTTPS transactional provider |
