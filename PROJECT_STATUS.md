# 📊 StudyBuddy AI Project Status Ledger

This document tracks all features, engineering upgrades, and architecture changes implemented so far, as well as the planned roadmap for upcoming improvements.

---

## ✅ Completed Changes (What has been built)

### 1. Modern Frontend Architecture (React)
- **React Query Integration:** Migrated data fetching in `ExplainPage` and `SummarizePage` to `@tanstack/react-query` using `useMutation` to handle errors, loading states, and mutate lifecycles robustly.
- **LLM Streaming:** Upgraded the Chat page to stream responses word-by-word (Server-Sent Events) using native JS `fetch` and `ReadableStream` decoding.
- **Text-to-Speech (TTS):** Added a stop-toggle TTS reader for AI responses on the Chat page using browser speech synthesis.
- **Flashcards Exporter:** Added a CSV exporter to the Flashcards page so users can download cards directly into Anki.
- **Telemetry & Analytics:** Integrated Vercel Analytics (`@vercel/analytics`) and Vercel Speed Insights (`@vercel/speed-insights`) at the root entry point.
- **User Session & Security:** Added global `AuthContext` with local storage session persistence, login/register views, and automatic Axios JWT token headers injection.
- **Marketing Homepage:** Designed a high-impact, mobile-responsive landing page at `/` articulating all 5 tools.

### 2. High-Performance Backend (Django REST Framework)
- **Django DB Caching:** Implemented a caching system database table (`studybuddy_cache`) to cache identical Groq LLM requests for 7 days (reducing API costs and yielding sub-millisecond loads).
- **SSE Stream Endpoints:** Created a custom `/api/chat/stream/` view returning `StreamingHttpResponse` returning text tokens dynamically.
- **Client Refactoring:** Renamed and upgraded the LLM client engine to Groq using the `llama-3.3-70b-versatile` model.
- **JWT Authentication:** Configured SimpleJWT auth tokens integration, default endpoint permission locks (`IsAuthenticated`), and user registration endpoint creation.

### 3. Enterprise Quality Gates & Telemetry
- **GlitchTip Error Tracking:** Configured fully-free, Sentry-compatible telemetry dashboards on app errors using `@sentry/react` and `sentry-sdk`.
- **Ruff Python Linter:** Configured Ruff to instantly enforce PEP8 code formatting and styling standards.
- **ESLint Frontend Linter:** Added ESLint standards configuration to package.json scripts to enforce clean React coding rules.
- **Pytest Suite:** Wrote 13 isolated unit tests with mock handlers and automatic SQLite database overrides during testing.
- **GitHub Actions (CI/CD):** Created `.github/workflows/ci.yml` pipeline that triggers on push/PR to run testing and lint scripts.

---

## 🔮 Upcoming Upgrades (Planned Roadmap)

### Phase 1: Compile-Time Safety
- [ ] **TypeScript Migration:** Convert the React frontend from JS/JSX to TS/TSX.
- [ ] **Python Typing:** Add strict type hinting across all Django views, serializers, and clients, enforcing check validations in CI using `mypy`.

### Phase 2: Scale & Background Processing
- [ ] **Asynchronous Task Queues:** Configure **Celery** with **Redis** to offload long-running tasks (like generating 15 detailed flashcards or parsing files) to background workers.
- [ ] **Redis Caching:** Replace backend SQLite caches with a distributed Redis storage container for ultra-fast session cache pools.

### Phase 3: Advanced AI & RAG
- [ ] **Vector Database integration:** Implement **pgvector** or **Pinecone** to store semantic embeddings.
- [ ] **Upload PDF Material (RAG):** Enable users to upload notes and textbooks so the AI can answer questions scoped directly to their class material.

### Phase 4: Production Security & OAuth
- [ ] **OAuth2 Integration:** Implement Google and GitHub OAuth2 sign-in flows.
- [ ] **Rate Limiting:** Add Redis-based IP rate limiters to protect Groq API keys from abuse.
