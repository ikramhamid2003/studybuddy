# 📚 StudyBuddy AI — Documentation

The root [`README.md`](../README.md) is the 60-second tour: what the app is, the live
link, the demo account, screenshots, the highlights, and how to run it locally. This
folder is everything else.

## Reading order

| Page | What it covers |
|------|----------------|
| **[Getting started](getting-started.md)** | Prerequisites, the `.env` reference, manual setup, the one-command Docker stack, and a sample document to try. |
| **[Features](features.md)** | Every capability in depth: the six tools, document grounding, the dashboard, scraping, caching, the token budget, and cancellation. |
| **[Architecture](architecture.md)** | Repository layout, the request flow, the single grounding path, the cache key, the budget/throttle layers, and the SSRF guard. |
| **[API reference](api.md)** | All 17 endpoints, the JWT auth flow, and the error-shape contract the frontend relies on. |
| **[Deployment](deployment.md)** | Render + Neon + Vercel, the build-time migration-drift check, the pgvector opt-in, and the free-tier caveats. |
| **[Performance](performance.md)** | "By the numbers": scale, measured latencies, the cost levers, and what this repo does *not* claim. |
| **[Quality](quality.md)** | The test suites, the CI jobs, and the exact commands that re-measure every number quoted in this repo. |

## Screenshots and the demo GIF

The images in the root README live in [`assets/`](assets/README.md), which also
documents how each one was captured and how to regenerate them.
