# Improvements

A working list of concrete, verifiable improvements for StudyBuddy. Each task carries a
`COMPLETED` comment directly above it recording what changed and how it was verified.

**Baseline measured on 2026-11-25 (before any change):**

- Backend: `pytest` → **194 collected** (193 passed, 1 skipped), **377 s** wall time,
  81 warnings (`No directory at: backend/staticfiles/`).
- Frontend: `vitest run` on the committed tests → **20 suites · 181 tests**, all passing.
- Lint: `ruff check backend/` clean; `eslint src` clean once `npm ci` installed the locked
  dependencies (the earlier 552-error run was a stale `node_modules`, not a repo bug).
- API surface: **22 routes** (`19` under `study_api.urls` plus token blacklist, OpenAPI
  schema and Swagger UI); the OpenAPI document lists **19 paths**.

**After this pass:** backend **195 collected** (194 passed, 1 skipped) in **4.17 s** with
no warnings; committed frontend suite still **20 suites · 181 tests**; Ruff, the
migration-drift check and the production build all pass.

> Out of scope: the uncommitted quiz-refactor work in
> `frontend/src/components/shared/Quiz{QuestionCard,Results}.jsx` and their `.test.jsx`
> files. Those files are someone's in-progress work and were left untouched. They
> currently fail (`jest.fn()` is not defined under Vitest) and will need `vi.fn()` before
> they can be committed.

---

<!-- COMPLETED 2026-11-25: added PASSWORD_HASHERS=[MD5] to the IS_TESTING branch of settings.py; full suite dropped from 377 s to 4.17 s with identical results (194 passed, 1 skipped). -->
## 1. ✅ Speed up the backend test suite

Use a fast password hasher while testing. The register/login tests spent seconds each in
PBKDF2 (Django's production hasher deliberately costs CPU); switching to MD5 only when
`IS_TESTING` is set keeps production unchanged and cut the suite's wall time.

- [x] Added `PASSWORD_HASHERS` (MD5) to the `IS_TESTING` branch in
  `backend/studybuddy/settings.py`.
- [x] Re-ran the full suite: **4.17 s**, `194 passed, 1 skipped`.

<!-- COMPLETED 2026-11-25: STATIC_ROOT.mkdir(parents=True, exist_ok=True) when IS_TESTING in settings.py; pytest now prints no warnings summary. -->
## 2. ✅ Eliminate the `No directory at: staticfiles` warnings

Every test request logged a WhiteNoise warning because `STATIC_ROOT` did not exist during
tests. Creating that directory under `IS_TESTING` removes the duplicates and makes the
warning summary meaningful again.

- [x] Created `STATIC_ROOT` when `IS_TESTING` in `backend/studybuddy/settings.py`.
- [x] Confirmed the suite runs with **no warnings summary**.

<!-- COMPLETED 2026-11-25: added study_api/tests/test_health.py; it passes in the full run. -->
## 3. ✅ Cover the public health endpoint with a test

`/api/health/` is the endpoint the Docker healthcheck, the Render platform and the
keep-alive workflow depend on, but it had no test.

- [x] Added `backend/study_api/tests/test_health.py` asserting it is reachable without
  auth and returns `{"status": "ok"}`.

<!-- COMPLETED 2026-11-25: updated README.md, docs/README.md, docs/features.md, docs/performance.md and docs/quality.md; also refreshed the CI job descriptions. -->
## 4. ✅ Sync stale test and endpoint counts in the docs

The docs quoted 151 Pytest tests / 169 Vitest tests in 19 suites / 11 modules and
"17 endpoints". The real numbers are 195 tests in 15 modules, 181 tests in 20 suites,
19 OpenAPI paths (22 routes).

- [x] Updated `README.md`, `docs/README.md`, `docs/features.md`, `docs/performance.md`
  and `docs/quality.md`.
- [x] Kept the RAG/grounding share accurate (69 of the 195).
- [x] Replaced the stale "17 endpoints" phrase with "every API route" so it cannot rot.
- [x] Corrected the OpenAPI path count (19) and migration-file count (8) in
  `docs/performance.md`.

<!-- COMPLETED 2026-11-25: added root .editorconfig (UTF-8, final newline, trailing-whitespace trim, 2/4-space indent). End-of-line is left unset because the tracked files are mixed. -->
## 5. ✅ Add an `.editorconfig`

Give editors one cross-language whitespace contract (UTF-8, final newline, 2-space
default, 4-space Python) so stray trailing whitespace stops leaking into diffs. Line
endings are intentionally not forced: the tracked files are currently mixed (Markdown
and YAML are LF, several Python/JS files are CRLF), so an EOL rule would rewrite whole
files on save.

- [x] Added a root `.editorconfig`.

<!-- COMPLETED 2026-11-25: added .python-version (3.12) and .nvmrc (24). -->
## 6. ✅ Pin local toolchains to the CI versions

CI runs Python 3.12 and Node 24 (and `package.json` declares `node: 24.x`). Pinned both
for local tools so a contributor's shell matches CI.

- [x] Added `.python-version` (`3.12`).
- [x] Added `.nvmrc` (`24`).

<!-- COMPLETED 2026-11-25: added SECURITY.md. -->
## 7. ✅ Add a `SECURITY.md`

Documented private reporting, supported versions, and the secret-handling rules the repo
already enforces (`.env` files ignored, keys only in the environment), plus a deployment
hardening checklist.

- [x] Added `SECURITY.md`.

<!-- COMPLETED 2026-11-25: added CONTRIBUTING.md and linked it plus SECURITY.md from README.md and docs/README.md. -->
## 8. ✅ Add a `CONTRIBUTING.md` and link the docs

Explained the local setup, the exact quality gates CI runs, the migration-drift rule, and
the commit/PR conventions, so a new contributor can reproduce a green build without
reading the workflows.

- [x] Added `CONTRIBUTING.md`.
- [x] Linked `CONTRIBUTING.md` and `SECURITY.md` from `README.md` and `docs/README.md`.

---

## Verification log (2026-11-25)

| Gate | Command | Result |
|------|---------|--------|
| Python lint | `cd backend && python -m ruff check .` | `All checks passed!` |
| Migration drift | `python manage.py makemigrations --check --dry-run` | `No changes detected` |
| Backend tests | `cd backend && python -m pytest -q` | **194 passed, 1 skipped** · 4.17 s · no warnings |
| Frontend lint | `cd frontend && npx eslint src` | clean on committed files (the only errors are the two untracked WIP test files, left untouched) |
| Frontend tests | `cd frontend && npx vitest run` (committed files) | **20 suites · 181 passed** |
| Production build | `cd frontend && npm run build` | built successfully in 2.34 s |

### Observed but not changed

- `npm run build` warns that the main JS chunk exceeds 500 kB (181.5 kB gzipped).
  Code-splitting the studio/pages would be a follow-up with a wider blast radius.
- `ruff format --check` would reformat 34 files. Adding a format gate is worth doing,
  but it belongs in its own mechanical commit rather than mixed into this pass.
- The repo has mixed line endings (Python/JS CRLF, Markdown/YAML LF) and no
  `.gitattributes`. Normalizing is a mechanical follow-up; `.editorconfig` deliberately
  leaves EOL unset so it does not rewrite whole files.
- The two untracked quiz test files use `jest.fn()` instead of `vi.fn()`; see the note
  at the top.
