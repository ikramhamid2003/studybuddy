# 📚 StudyBuddy AI — Full Stack

**Live Web App:** [https://studybuddy-omega-gray.vercel.app/](https://studybuddy-omega-gray.vercel.app/)  
**Backend API:** Deployed on Render · **Database:** Neon PostgreSQL

> An AI-powered study companion featuring **Explain**, **Summarize**, **Quiz Generator**, **Flashcard Creator**, an **All-in-One Studio** that runs every tool from one page, and a **Real-Time Streaming AI Chatbot** with saved conversations.
>
> **Tech Stack:** React + Tailwind CSS + React Query · Django REST Framework · LangChain (`langchain-groq` / `ChatGroq`) on the Groq API (`openai/gpt-oss-120b`) · Neon PostgreSQL · JWT · Pytest & Ruff

---

## ✨ Features

- **5 AI Study Tools**, each with its own saved history:
  - 🧠 **Explain Concept:** Clear explanations tailored to Beginner, Intermediate, or Advanced levels with analogies and examples.
  - 📝 **Summarize Notes:** Condenses study material into concise summaries, key concepts, defined terms, and study tips.
  - ❓ **Quiz Generator:** Generates customizable multiple-choice quizzes with explanations for correct answers.
  - 🎴 **Flashcard Creator:** Creates interactive 3D flip flashcards with hints and **Anki CSV export**.
  - 💬 **AI Study Buddy Chat:** Multi-turn conversational AI tutor with **real-time word-by-word streaming (SSE)** and **persisted chat sessions** (create, rename, delete) stored in PostgreSQL.
- **🎛️ All-in-One Studio (`/all`):** Runs any tool with its full options in one place, filters the combined generation history by tool, and lets you reopen or **delete** any saved result.
- **🦜 LangChain Integration:** All LLM calls go through `langchain-groq` (`ChatGroq`) in `langchain_client.py` — plain text, JSON, SSE streaming, and **structured output validated against Pydantic schemas** (Quiz & Flashcards). Structured calls use JSON prompting with `JsonOutputParser` rather than native tool-calling, so they also work on models that do not implement tools.
- **⚡ High-Performance Groq LLM API:** Fast, low-latency Groq models — `openai/gpt-oss-120b` by default, overridable with `GROQ_MODEL`.
- **💾 Database Request Caching:** Identical LLM requests are cached in Django for 7 days (`studybuddy_cache` table), eliminating duplicate API costs and serving instant responses.
- **🔄 React Query Integration:** Efficient frontend data fetching, caching, and mutation state management; history and session lists invalidate automatically after a generate, rename, or delete.
- **📱 Responsive UI:** A desktop sidebar that collapses to an icon rail, a chat session rail that collapses the same way, and both becoming a dropdown menu / slide-over drawer on smaller screens.
- **🔐 Session & Security:** JWT authentication (`rest_framework_simplejwt`, 1-day access / 7-day refresh tokens) with automatic bearer-token injection, plus anonymous rate limiting (60 req/hour) on the API.
- **📊 Telemetry & Error Tracking:** Vercel Analytics & Speed Insights for Core Web Vitals, and **GlitchTip** (Sentry-compatible) error tracking on both frontend (`@sentry/react` with session replay) and backend (`sentry-sdk` Django integration).
- **🛡️ Quality Gates:** Ruff Python linter, a **39-test Pytest suite**, ESLint, and **28 Jest tests across 6 suites** — all enforced in **GitHub Actions CI/CD**.

---

## 📁 Repository Structure

```text
studybuddy/
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI pipeline (Ruff + Pytest + ESLint + Jest)
├── frontend/                  # React + Tailwind CSS UI
│   ├── public/
│   ├── src/
│   │   ├── components/       # Layout (collapsible sidebar / mobile dropdown), PageHeader, Card,
│   │   │                     # Button, Input, LoadingSkeleton, ToolHistory, ErrorBoundary
│   │   │   └── shared/       # ChatBubble, Flashcard, ScoreCard, SectionTitle, TypeBadge
│   │   ├── pages/            # Home, All, Explain, Summarize, Quiz, Flashcards, Chat, Login, Register
│   │   ├── context/          # AuthContext for JWT session management
│   │   ├── utils/            # api.js (fetch client for the unified endpoint), routeColors, clipboard
│   │   ├── App.jsx           # Routing & React Query provider
│   │   └── index.css         # Tailwind directives & menu / button / icon component classes
│   └── package.json
│
├── backend/                    # Django REST Framework API
│   ├── studybuddy/            # Project config (settings.py, urls.py, wsgi.py)
│   ├── study_api/             # API surface
│   │   ├── dispatchers.py     # Unified action handlers (ACTION_MAP) + system prompts
│   │   ├── langchain_client.py # LangChain/Groq client (text, JSON, streaming, structured output)
│   │   ├── content_fetcher.py # Optional URL → readable page content extraction
│   │   ├── models.py          # ChatSession, ChatMessage & Generation persistence
│   │   ├── schemas.py         # Pydantic schemas for structured output
│   │   └── tests/             # Pytest suite (views, generations, chat sessions, langchain client)
│   ├── build.sh               # Build script for Render deployment
│   ├── manage.py
│   ├── pytest.ini
│   ├── requirements.txt
│   └── .env                   # Local env vars (gitignored — never commit)
│
├── render.yaml                 # Render Blueprint (Infrastructure-as-Code)
└── README.md
```

---

## ⚙️ 1. Backend Setup

### Prerequisites
- Python 3.12+ installed
- A PostgreSQL database — the easiest free option is [Neon](https://neon.tech) (copy the connection string)
- Free Groq API key from [console.groq.com](https://console.groq.com)

### Steps

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
source venv/bin/activate        # On macOS/Linux
venv\Scripts\activate           # On Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file in the backend directory
cat <<EOT > .env
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
SECRET_KEY=some-long-random-secret-key
DEBUG=True
EOT
# Optional: GLITCHTIP_DSN for backend error tracking

# Apply database migrations & create the cache table
python manage.py migrate
python manage.py createcachetable

# Start Django development server
python manage.py runserver
```

Backend server runs at: **`http://localhost:8000`**

> **Notes**
> - Running the Pytest suite does **not** require a real database — tests automatically switch to SQLite (`db_test.sqlite3`).
> - Omitting `DATABASE_URL` also works for local development: settings fall back to `backend/db.sqlite3`.
> - `ALLOWED_HOSTS` defaults to `localhost,127.0.0.1,.onrender.com`, so local development needs nothing extra. If you set it yourself (for example by copying a deployed value into `.env`), include `127.0.0.1` — otherwise Django rejects every local request with `DisallowedHost` (HTTP 400).

---

## 💻 2. Frontend Setup

```bash
cd frontend

# Install Node modules
npm install

# Start React development server
npm start
```

Frontend application runs at: **`http://localhost:3000`** and calls `http://localhost:8000/api` by default. Point it elsewhere with `REACT_APP_API_URL` (set in `.env` for dev, `.env.production` for builds).

---

## 🧪 3. Running Quality Checks & Tests

### Backend Tests & Linting
```bash
cd backend

# Run Pytest suite (39 tests)
pytest

# Run Ruff lint checks
ruff check .
```

### Frontend Tests & Linting
```bash
cd frontend

# Run ESLint
npm run lint

# Run unit tests (28 tests across 6 suites)
npm test -- --watchAll=false
```

Both suites also run automatically in GitHub Actions on every push/PR to `main`.

---

## 📡 API Endpoints Reference

### Unified endpoint (what the frontend uses)

Every frontend call is a `POST /api/unified/` carrying an `action` field, so the app has one URL and one response envelope: `{"ok": true, "data": …}` on success, `{"ok": false, "error": "…"}` on failure. Public actions are listed below; everything else requires a JWT bearer token.

| Action | Auth | Description |
|--------|------|-------------|
| `health` | Public | Service health check |
| `register` | Public | Create a new user account |
| `login` | Public | Obtain JWT access + refresh tokens |
| `refresh` | Public | Exchange a refresh token for a new access token |
| `generate` | JWT | Run any tool and persist the result. Body: `topic`, `type` (`explain` \| `summarize` \| `quiz` \| `flashcards` \| `chat`) plus optional per-tool params: `level` (explain), `format` (summarize), `num_questions` + `difficulty` (quiz), `num_cards` (flashcards), `history` (chat) |
| `generations_list` | JWT | List saved generations, newest first; optional `query_type` filters by tool |
| `generation_delete` | JWT | Delete one saved generation owned by the caller |
| `chat_stream` | JWT | Real-time SSE streaming chat. Returns `text/event-stream` instead of the JSON envelope, and reports mid-stream failures as an `{"error": …}` frame |
| `sessions_list` | JWT | List chat sessions for the sidebar |
| `session_create` | JWT | Create an empty chat session |
| `sessions_detail` | JWT | Fetch one session with its persisted messages |
| `session_rename` | JWT | Rename a chat session |
| `session_delete` | JWT | Delete a chat session and its messages |
| `unregister` | JWT | Delete the authenticated user account |

### Legacy per-resource routes

Kept for compatibility (and exercised directly by the test suite):

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health/` | Public | Service health check |
| `POST` | `/api/generate/` | JWT | Run a tool and persist the result |
| `GET` | `/api/generations/` | JWT | List persisted generations (`?type=` filter) |
| `POST` | `/api/chat/stream/` | JWT | Real-time Server-Sent Events (SSE) streaming chat |
| `GET` / `POST` | `/api/sessions/` | JWT | List or create chat sessions |
| `GET` / `PATCH` / `DELETE` | `/api/sessions/<id>/` | JWT | Retrieve, rename, or delete a chat session |
| `POST` | `/api/auth/register/`, `/api/auth/login/`, `/api/auth/refresh/` | Public | Authentication (also reachable as unified actions) |

---

## 🚀 4. Deployment

### Backend (Render + Neon)
1. Create a free PostgreSQL database on [Neon](https://neon.tech) and copy its connection string.
2. Go to your [Render Dashboard](https://dashboard.render.com/) → **New +** > **Blueprint** and connect this repository — [`render.yaml`](render.yaml) defines the Django web service (gunicorn + WhiteNoise, health check at `/api/health/`).
3. In the service's Environment settings, set `DATABASE_URL` to your Neon connection string and `GROQ_API_KEY` to your Groq key (both are declared `sync: false` in the Blueprint).
4. Optionally set `GROQ_MODEL` if you want a model other than the `openai/gpt-oss-120b` default. Render's environment overrides the code default, so if you set this here you must keep it in sync with the model your Groq key can actually use.
5. Run `python manage.py migrate` against the Neon database (e.g. from the Render shell). `build.sh` already runs `collectstatic`, `createcachetable`, and `migrate` on every deploy.

> **Note:** the Groq model is account-scoped. If `generate` or `chat_stream` returns a `model_not_found` error, list the models your key can use with `GET https://api.groq.com/openai/v1/models` and set `GROQ_MODEL` accordingly — the model catalogue changes over time.

### Frontend (Vercel)
1. Connect the `frontend/` directory to Vercel.
2. Set `REACT_APP_API_URL` to your deployed Render backend URL, and optionally `REACT_APP_GLITCHTIP_DSN` for frontend error tracking.
3. Deploy! Any `*.vercel.app` origin is automatically allowed by the backend's CORS config.
