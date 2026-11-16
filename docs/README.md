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

## Where did the old README go?

The previous single-file README (≈53 KB) was split up when the root README was
rewritten as a short tour. Nothing was dropped:

| Old README section | Now lives in |
|--------------------|--------------|
| Title, live link, tech stack | Root [`README.md`](../README.md) |
| ✨ Features | [Features](features.md) — condensed into 8 "Highlights" bullets in the root README |
| 📊 By the numbers → Scale | [Performance](performance.md) |
| 📊 By the numbers → Quality & build | [Quality](quality.md) |
| 📊 By the numbers → Performance levers | [Performance](performance.md) |
| 📊 Measured end-to-end + caveats | [Performance](performance.md) |
| 📁 Repository Structure | [Architecture](architecture.md) |
| ⚙️ 1. Backend Setup (incl. `.env` template) | [Getting started](getting-started.md), plus [`backend/.env.example`](../backend/.env.example) |
| 💻 2. Frontend Setup | [Getting started](getting-started.md) |
| 🐳 Docker Quickstart | [Getting started](getting-started.md) |
| 🧪 3. Running Quality Checks & Tests | [Quality](quality.md) |
| 📡 API Endpoints Reference | [API reference](api.md) |
| 🚀 4. Deployment | [Deployment](deployment.md) |

## Screenshots and the demo GIF

The images in the root README live in [`assets/`](assets/README.md), which also
documents how each one was captured and how to regenerate them.
