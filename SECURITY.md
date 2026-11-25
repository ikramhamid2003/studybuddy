# Security Policy

## Supported versions

Security fixes land on `main`, which is what the live deployment tracks. There are no
maintained release branches.

## Reporting a vulnerability

Please **do not open a public issue** for a suspected vulnerability.

Use GitHub's private vulnerability reporting for this repository
(**Security → Report a vulnerability**). Include:

- what the issue is and where it lives (endpoint, file, or UI route);
- how to reproduce it, ideally with the smallest request or sequence that shows it;
- the impact you think it has (for example: another user's data, key exposure,
  denial of service).

We will acknowledge the report, investigate, and coordinate a fix and disclosure date
with you.

## What this app already assumes

These are deliberate design choices, not vulnerabilities in themselves:

- **Secrets live only in the environment.** `backend/.env` and `frontend/.env*` are
  git-ignored. Never commit keys, tokens, or DSNs. Production keys belong in the Render
  and Vercel dashboards.
- **`DEBUG` is off unless the environment turns it on.** Leaving it off keeps tracebacks
  (which can include prompt text) out of responses.
- **Users are isolated.** Generations, chat sessions and uploaded documents are scoped to
  the authenticated user; a foreign ID is treated as not found.
- **URL scraping is SSRF-hardened.** Every hop is resolved and checked against private
  address ranges, and an optional allowlist can restrict hosts further.
- **Spend is capped.** Each account has a daily token budget, and requests are throttled
  per user and per action.

## Hardening checklist for a deployment

- Set a strong, unique `SECRET_KEY` and leave `DEBUG` unset or `false`.
- Set `FORCE_HTTPS=true` behind a TLS-terminating proxy so cookies and HSTS are enabled.
- Keep `ALLOWED_SCRAPE_DOMAINS` set if you do not need to fetch arbitrary public URLs.
- Rotate any key that has ever been pasted into a log, an issue, or a chat.
