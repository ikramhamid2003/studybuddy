# 📚 StudyBuddy AI — Full Stack

**Live Web App:** [https://studybuddy-omega-gray.vercel.app/](https://studybuddy-omega-gray.vercel.app/)  
**Backend API:** Deployed on Render · **Database:** Neon PostgreSQL

> An AI-powered study companion featuring **Explain**, **Summarize**, **Quiz Generator**, **Flashcard Creator**, and a **Real-Time Streaming AI Chatbot** with saved conversations.  
> **Tech Stack:** React + Tailwind CSS + React Query · Django REST Framework · LangChain (`langchain-groq` / `ChatGroq`) on the Groq API (`groq/compound-mini`) · Neon PostgreSQL · JWT · Pytest & Ruff

---

## ✨ Features

- **5 AI Study Tools:**
  - 🧠 **Explain Concept:** Clear explanations tailored to Beginner, Intermediate, or Advanced levels with analogies and examples.
  - 📝 **Summarize Notes:** Condenses study material into concise summaries, key concepts, defined terms, and study tips.
  - ❓ **Quiz Generator:** Generates customizable multiple-choice quizzes with explanations for correct answers.
  - 🎴 **Flashcard Creator:** Creates interactive 3D flip flashcards with hints and **Anki CSV export**.
  - 💬 **AI Study Buddy Chat:** Multi-turn conversational AI tutor with **real-time word-by-word streaming (SSE)**, native **Text-to-Speech (TTS)**, and **persisted chat sessions** (create, rename, delete) stored in PostgreSQL.
- **🦜 LangChain Integration:** All LLM calls go through `langchain-groq` (`ChatGroq`) in `langchain_client.py` — plain text, JSON, SSE streaming, and **structured output via Groq native tool-calling** validated against Pydantic schemas (used by Quiz & Flashcards).
- **⚡ High-Performance Groq LLM API:** Fast, low-latency Groq models (`groq/compound-mini` default).
- **💾 Database Request Caching:** Identical LLM requests are cached in Django for 7 days (`studybuddy_cache` table), eliminating duplicate API costs and serving instant responses.
- **🔄 React Query Integration:** Efficient frontend data fetching, caching, and mutation state management.
- **📱 Responsive UI:** Full-featured sidebar on desktop that becomes a dropdown navigation menu on smaller screens.
- **🔐 Session & Security:** JWT authentication (`rest_framework_simplejwt`, 1-day access / 7-day refresh tokens) with automatic token injection, plus anonymous rate limiting (60 req/hour) on the API.
- **📊 Telemetry & Error Tracking:** Vercel Analytics & Speed Insights for Core Web Vitals, and **GlitchTip** (Sentry-compatible) error tracking on both frontend (`@sentry/react` with session replay) and backend (`sentry-sdk` Django integration).
- **🛡️ Quality Gates:** Ruff Python linter, 24-test Pytest suite, ESLint, and Jest unit tests — all enforced in **GitHub Actions CI/CD**.

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
│   │   ├── components/       # Layout (responsive sidebar/dropdown), PageHeader, Card, Button, Input, LoadingSkeleton
│   │   ├── pages/            # Home, Explain, Summarize, Quiz, Flashcards, Chat, Login, Register
│   │   ├── context/          # AuthContext for JWT session management
│   │   ├── utils/            # api.js (Axios instance with JWT interceptor)
│   │   ├── App.jsx           # Routing & React Query provider
│   │   └── index.css         # Tailwind directives & custom CSS
│   └── package.json
│
├── backend/                    # Django REST Framework API
│   ├── studybuddy/            # Project config (settings.py, urls.py, wsgi.py)
│   ├── study_api/             # API views, serializers, schemas, models
│   │   ├── langchain_client.py # LangChain/Groq client (text, JSON, streaming, structured output)
│   │   ├── models.py          # ChatSession & ChatMessage persistence
│   │   └── tests/             # Pytest suite (views, langchain client, chat sessions)
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
GROQ_MODEL=groq/compound-mini
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

> **Note:** Running the Pytest suite does **not** require a real database — tests automatically switch to SQLite (`db_test.sqlite3`).

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

# Run Pytest suite (24 unit tests)
pytest

# Run Ruff lint checks
ruff check .
```

### Frontend Tests & Linting
```bash
cd frontend

# Run ESLint
npm run lint

# Run unit tests
npm test -- --watchAll=false
```

Both suites also run automatically in GitHub Actions on every push/PR to `main`.

---

## 📡 API Endpoints Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health/` | Public | Service health check |
| `POST` | `/api/auth/register/` | Public | Register a new user account |
| `POST` | `/api/auth/login/` | Public | Obtain JWT access and refresh tokens |
| `POST` | `/api/auth/refresh/` | Public | Refresh expired JWT access token |
| `POST` | `/api/explain/` | JWT | Generate topic explanation (cached 7 days) |
| `POST` | `/api/summarize/` | JWT | Summarize study notes (cached 7 days) |
| `POST` | `/api/quiz/` | JWT | Generate multiple-choice quiz (cached 7 days) |
| `POST` | `/api/flashcards/` | JWT | Create study flashcards (cached 7 days) |
| `POST` | `/api/chat/` | JWT | Multi-turn study assistant chat |
| `POST` | `/api/chat/stream/` | JWT | Real-time Server-Sent Events (SSE) streaming chat |
| `GET` / `POST` | `/api/sessions/` | JWT | List or create chat sessions |
| `GET` / `PATCH` / `DELETE` | `/api/sessions/<id>/` | JWT | Retrieve, rename, or delete a chat session |

---

## 🚀 4. Deployment

### Backend (Render + Neon)
1. Create a free PostgreSQL database on [Neon](https://neon.tech) and copy its connection string.
2. Go to your [Render Dashboard](https://dashboard.render.com/) → **New +** > **Blueprint** and connect this repository — [`render.yaml`](render.yaml) defines the Django web service (gunicorn + WhiteNoise, health check at `/api/health/`).
3. In the service's Environment settings, set `DATABASE_URL` to your Neon connection string and `GROQ_API_KEY` to your Groq key (both are declared `sync: false` in the Blueprint).
4. Run `python manage.py migrate` against the Neon database (e.g. from the Render shell).

### Frontend (Vercel)
1. Connect the `frontend/` directory to Vercel.
2. Set `REACT_APP_API_URL` to your deployed Render backend URL, and optionally `REACT_APP_GLITCHTIP_DSN` for frontend error tracking.
3. Deploy! Any `*.vercel.app` origin is automatically allowed by the backend's CORS config.
