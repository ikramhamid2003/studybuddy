# Quality — tests, lint and CI

---

## The suites

| Suite | Command | Size |
|-------|---------|------|
| Backend (pytest) | `cd backend && pytest` | **11 modules · 151 tests** — one of them (the pgvector case) skips on SQLite |
| Frontend (Jest) | `cd frontend && npm test -- --watchAll=false` | **8 suites · 112 tests** |
| Python lint (Ruff) | `cd backend && ruff check .` | 0 errors |
| Frontend lint (ESLint) | `cd frontend && npm run lint` | 0 errors, 0 warnings (ESLint is not `--max-warnings 0`, so CI stays green on warnings) |
| Type check | `uvx pyrefly check --min-severity warn` | warnings are hidden at the default severity. Configs: `pyrefly.toml` (root + backend) and `pyrightconfig.json` |

### What the suites cover

- **API client** (`frontend/src/utils/api.test.js`, 46 tests) — document-grounded streaming, request cancellation, server-reported error reasons, session teardown, the reason an auth endpoint rejects a signup, document-selection ownership and the 25-document cap.
- **Personalization** (`frontend/src/utils/personalize.test.js`, 31 tests) — streaks, activity windows, tool mix, intent routing, suggestions, checklist.
- **Dashboard** (`frontend/src/components/home/HomeDashboard.test.jsx`, 14 tests) — keeps a failed request from masquerading as an empty account.
- **Auth** (`frontend/src/context/AuthContext.test.jsx`, 7 tests) — cache teardown and auth-rejection handling.
- **Document library** (`frontend/src/components/shared/documentLibrary.test.jsx`, 4 tests) — selection ownership.
- **Component render tests** — `Button`, `Card`, `Input`.
- **Backend** — `test_rag.py` (54) and `test_generations.py` (15) cover RAG and grounding (69 of the 151); the rest cover views, chat sessions, the LangChain client, the content fetcher, throttling, token security, usage tracking and re-indexing.

> The Pytest suite needs **no real database** — it switches to SQLite (`db_test.sqlite3`)
> automatically. The single exception is the pgvector branch of `retrieve_chunks()`,
> which cannot run on SQLite; CI sets `TEST_DATABASE_URL` to a Postgres + pgvector
> service for that job only.

---

## CI — `.github/workflows/ci.yml`

Runs on every push and pull request to `main`, in three jobs:

| Job | What it does |
|-----|--------------|
| **Backend Quality & Tests** | Python 3.12 → `ruff check backend/` → the **migration-drift check** (`python manage.py makemigrations --check --dry-run`, the same gate `backend/build.sh` runs before a deploy migrates) → the full pytest suite. |
| **RAG pgvector SQL** | A `pgvector/pgvector:pg16` Postgres service, `CREATE EXTENSION IF NOT EXISTS vector` on `template1` (deliberately not a migration — a deployment whose database user cannot create extensions must still be able to fall back), then `pytest study_api/tests/test_rag.py -k pgvector`. |
| **Frontend Quality & Tests** | Node 24 (matching `engines.node`) → `npm ci --legacy-peer-deps` → `npm run lint` → `npm test -- --watchAll=false`. The lockfile is not allowed to disagree with `package.json`: there is no `|| npm install` fallback, so a drifted lockfile fails the build instead of silently resolving something else. |

A fourth workflow, **Keep API Warm** (`.github/workflows/keepalive.yml`), pings
`/api/health/` every 10 minutes so Render's free instance does not spin down. That ping
is deliberately tolerant — it waits out a cold start and reports a non-200 as a warning
rather than failing the job, because a slow start is not a deployment failure.

---

## Re-measuring every number in this repo

The figures in [Performance](performance.md) are re-measured, not carried forward by
hand. Run these to reproduce them:

| Figure | Command |
|--------|---------|
| Pytest test count | `cd backend && pytest --collect-only -q` |
| Jest test count | `cd frontend && npm test -- --watchAll=false` |
| Python lint | `cd backend && ruff check .` |
| Frontend lint | `cd frontend && npm run lint` |
| Production build size | `cd frontend && npm run build` |
| Backend files / lines | `find backend -name '*.py' -not -path '*/venv/*' \| wc -l` and `-exec cat {} + \| wc -l` |
| Frontend files / lines | `find frontend/src \( -name '*.js' -o -name '*.jsx' -o -name '*.css' \) \| wc -l` and `-exec cat {} + \| wc -l` |
| API path count | `GET /api/schema/` → count `paths:` keys |
| Frontend route count | `frontend/src/App.jsx` |
| Migrations | `ls backend/study_api/migrations`; `django_migrations` |
| Dependency counts | `backend/requirements.txt`, `backend/requirements-dev.txt`, `frontend/package.json` |
| Docker services | `docker compose config --services` |
| RAG + grounding test share | `pytest --collect-only -q \| grep -c test_rag` and `grep -c test_generations` |

The measured end-to-end latency table in [Performance](performance.md) is **not**
reproduced by these commands — it needs live provider calls, so it keeps its original
2026-10-16 conditions block and sample sizes.
