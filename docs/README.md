# 📚 StudyBuddy AI — Documentation

The root [`README.md`](../README.md) is the 60-second tour: what the app is, the live
link, the highlights, and how to run it locally. This folder is everything else.

## Reading order

| Page | What it covers |
|------|----------------|
| **[Getting started](getting-started.md)** | Prerequisites, the `.env` reference, manual setup, the one-command Docker stack, and a sample document to try. |
| **[Features](features.md)** | Every capability in depth: the six tools, document grounding, the dashboard, scraping, caching, the token budget, spaced repetition, session security, accessibility and cancellation. |
| **[Architecture](architecture.md)** | Repository layout, the request flow, the single grounding path, the cache key, the budget/throttle layers, and the SSRF guard. |
| **[API reference](api.md)** | Every API route, the JWT and cookie-session auth flows, and the error-shape contract the frontend relies on. |
| **[Deployment](deployment.md)** | Render + Neon + Vercel, the build-time migration-drift check, the pgvector opt-in, and the free-tier caveats. |
| **[Performance](performance.md)** | "By the numbers": scale, measured latencies, the cost levers, and what this repo does *not* claim. |
| **[Quality](quality.md)** | The test suites, the CI jobs, and the exact commands that re-measure every number quoted in this repo. |

## Contributing and security

Setup, the gates CI runs, and PR conventions live in
[`CONTRIBUTING.md`](../CONTRIBUTING.md). To report a vulnerability, follow
[`SECURITY.md`](../SECURITY.md) instead of opening a public issue.

## Sample document

[`assets/sample-notes.txt`](assets/sample-notes.txt) is a short set of Biology 101 study
notes — upload it from any tool page to try document grounding locally.
[`assets/README.md`](assets/README.md) documents it.
