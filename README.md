# 📚 StudyBuddy AI

**An AI study companion that explains concepts, summarizes notes, quizzes you, builds flashcards, chats with you in real time — and answers from your own uploaded documents, with citations.**

🌐 **Live app:** [https://studybuddy-omega-gray.vercel.app/](https://studybuddy-omega-gray.vercel.app/) · **API:** [https://studybuddy-api-hkgx.onrender.com/api](https://studybuddy-api-hkgx.onrender.com/api) (Swagger UI at [`/api/docs/`](https://studybuddy-api-hkgx.onrender.com/api/docs/))

> Create your own free account on the live app — it runs on a free tier, so the
> 10,000-token daily budget is per account and starts fresh for you.

---

## ✨ Highlights

- **Real-time streaming chat** — replies arrive word by word over SSE, every session is persisted, and each turn is metered for tokens.
- **Document-grounded answers with citations** — upload PDF/TXT/MD, tick the notes in the picker, and any tool answers from them with a **SOURCES** panel.
- **Response caching** — an identical prompt is served from a 7-day Postgres cache with **0 tokens billed**; the cache key includes the selected document set.
- **Per-user daily token budget** — 10,000 tokens/day by default, refused with a 429 and drawn as a live meter on the dashboard.
- **SSRF-hardened scraping** — DNS-resolved IP validation, per-hop redirect re-checks and an optional domain allowlist on every URL fetch.
- **Spaced-repetition flashcards** — an SM-2 variant schedules new and due cards; review them with keys 1–4.
- **Hardened sessions** — optional httpOnly cookie sessions with a CSRF header check, throttled auth, strong password rules and HSTS.
- **Durable ingestion queue** — uploads are processed from a DB-backed queue with atomic claims, retries and a reaper.
- **Accessible UI** — labelled forms, focus management in dialogs, a live-region chat log, reduced-motion support and contrast-checked colours.
- **Every tool in one workspace** — Explain, Summarize, Quiz, Flashcards, Chat and the All-in-One Studio, plus a dashboard that knows what you studied.
- **Quality gates in CI** — Ruff, a migration-drift check, 207 Pytest tests (including a pgvector job against real Postgres), ESLint, 206 Vitest tests, a production build and dependency audits.
- **Predictable provider behaviour** — a 30 s request timeout with SDK retries off, and structured output validated against Pydantic schemas.

---

## 🛠️ Tech stack

React 18 + Vite + Tailwind CSS + React Query · Django REST Framework · LangChain (`langchain-groq`) on the Groq API · Gemini Embedding 2 + pgvector · Firecrawl / BeautifulSoup · Neon Postgres · JWT / httpOnly cookie sessions · Docker Compose · GitHub Actions

```text
  Browser (Vercel SPA)          Django REST API (Render · gunicorn)            Providers & Data
 ┌────────────────────┐         ┌──────────────────────────────┐          ┌────────────────────┐
 │ React · Tailwind   │  JSON   │ auth · throttles · budget    │   Groq   │ openai/gpt-oss-120b│
 │ React Query (cache)│◀───────▶│ GenerateView · ChatStreamView│◀────────▶│ langchain-groq      │
 │ DocumentPicker     │   SSE   │ _ground_documents()          │          └────────────────────┘
 └────────────────────┘         │        │                     │          ┌────────────────────┐
                                │        ▼                     │   embed  │ Gemini Embedding 2│
                                │ rag_pipeline (chunk→embed)   │─────────▶│ 768-dim vectors     │
                                │ content_fetcher (SSRF guard) │          └────────────────────┘
                                │        ▼                     │          ┌────────────────────┐
                                │ Neon Postgres                │◀────────▶│ pgvector + cache    │
                                │ generations · docs · cache   │          └────────────────────┘
                                └──────────────────────────────┘
```

---

## 🚀 Quick start

```bash
git clone https://github.com/ikramhamid2003/studybuddy.git
cd studybuddy
cp backend/.env.example backend/.env      # add GROQ_API_KEY and GEMINI_API_KEY
docker compose up --build
# → app http://localhost:3000 · API http://localhost:8000
```

The Compose stack runs the production topology — pgvector Postgres, gunicorn and an nginx-served React build — so it needs `backend/.env` or it refuses to start. No Docker? [`docs/getting-started.md`](docs/getting-started.md) has the manual path (venv + `npm install`) in four commands.

---

## 📚 Documentation

Everything else lives in [`docs/`](docs/README.md):

| | |
|---|---|
| **[Getting started](docs/getting-started.md)** | Prerequisites, the `.env` reference, manual setup, the Docker stack |
| **[Features](docs/features.md)** | Every capability in depth — the six tools, grounding, the dashboard, caching, the budget |
| **[Architecture](docs/architecture.md)** | Repository layout, the request flow, the grounding path, the cache key, the guard layers |
| **[API reference](docs/api.md)** | Every API route, the JWT flow, the error-shape contract |
| **[Deployment](docs/deployment.md)** | Render + Neon + Vercel, the pgvector opt-in, the free-tier caveats |
| **[Performance](docs/performance.md)** | "By the numbers" — measured latencies, the cost levers, and what this repo does *not* claim |
| **[Quality](docs/quality.md)** | The test suites, the CI jobs, and how to re-measure every number quoted here |

---

## 🤝 Contributing

[`CONTRIBUTING.md`](CONTRIBUTING.md) covers the toolchain, the exact gates CI runs, the
migration-drift rule, and the commit/PR conventions. Found a security problem? Use the
private reporting channel in [`SECURITY.md`](SECURITY.md) — please don't open a public
issue.

---

<div align="center">
  <sub>Built with Django REST Framework, LangChain and Groq · deployed on Render + Vercel + Neon</sub>
</div>
