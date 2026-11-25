# Contributing

Thanks for helping improve StudyBuddy. This page is the short path to a green build; the
full tour of the codebase is in [`docs/`](docs/README.md).

## Toolchain

CI pins the toolchain, and `.python-version` / `.nvmrc` pin the same versions for local
tools:

- Python **3.12**
- Node **24** (also declared in `frontend/package.json` → `engines.node`)

## Local setup

The one-command path is Docker:

```bash
cp backend/.env.example backend/.env   # add GROQ_API_KEY and GEMINI_API_KEY
docker compose up --build              # app on :3000, API on :8000
```

The manual path (venv + `npm install`) is in
[`docs/getting-started.md`](docs/getting-started.md).

## The quality gates CI runs

Run these before opening a pull request — they are exactly what
`.github/workflows/ci.yml` checks:

```bash
# Backend
cd backend
python -m ruff check .                                   # lint
python manage.py makemigrations --check --dry-run         # no model change without a migration
python -m pytest                                          # test suite (SQLite by default)

# Frontend
cd frontend
npm ci --legacy-peer-deps
npm run lint                                              # ESLint
npm test                                                  # Vitest
npm run build                                             # production build
```

Notes:

- **A model change needs a migration.** The `makemigrations --check` gate runs in CI and
  again in `backend/build.sh` before a deploy; a model edit without a migration fails the
  build rather than shipping a schema the code expects.
- **Keep the lockfile in sync.** CI uses `npm ci` with no fallback, so update
  `package-lock.json` in the same change as `package.json`.
- **The pgvector path needs Postgres.** The suite runs on SQLite except for the raw
  vector SQL, which CI exercises in a separate job against `pgvector/pgvector:pg16`. Point
  `TEST_DATABASE_URL` at a Postgres instance to run it locally.

## Commits and pull requests

- Keep the subject short and imperative, matching the history (for example
  "Add spaced-repetition review for flashcards"). Explain the *why* in the body.
- Target `main`. Describe the change, how you verified it, and any trade-offs.
- Keep behavioral changes small and reviewable; unrelated refactors belong in their own
  pull request.
- Add or update tests for the behavior you change, and update the relevant page under
  [`docs/`](docs/README.md) when a number or feature claim changes.

## Reporting security issues

Do not open a public issue. See [`SECURITY.md`](SECURITY.md) for private reporting.
