# 📚 StudyBuddy AI — Full Stack

**Live Web App:** [https://studybuddy-omega-gray.vercel.app/](https://studybuddy-omega-gray.vercel.app/)  
**Backend API:** Deployed on Render with 1-click `render.yaml` Blueprint.

> An AI-powered study companion featuring **Explain**, **Summarize**, **Quiz Generator**, **Flashcard Creator**, and **Real-Time Streaming AI Chatbot**.  
> **Tech Stack:** React + Tailwind CSS + React Query · Django REST Framework · Groq LLM API (`groq/compound-mini`) · Pytest & Ruff

---

## ✨ Features

- **5 AI Study Tools:**
  - 🧠 **Explain Concept:** Clear explanations tailored to Beginner, Intermediate, or Advanced levels with analogies and examples.
  - 📝 **Summarize Notes:** Condenses study material into concise summaries, key concepts, defined terms, and study tips.
  - ❓ **Quiz Generator:** Generates customizable multiple-choice quizzes with explanations for correct answers.
  - 🎴 **Flashcard Creator:** Creates interactive 3D flip flashcards with hints and **Anki CSV export**.
  - 💬 **AI Study Buddy Chat:** Multi-turn conversational AI tutor with **real-time word-by-word streaming (SSE)** and native **Text-to-Speech (TTS)**.
- **⚡ High-Performance Groq LLM API:** Uses fast, low-latency Groq models (`groq/compound-mini` default).
- **💾 Database Request Caching:** Identical LLM requests are cached in Django for 7 days (`studybuddy_cache`), eliminating duplicate API costs and serving instant responses.
- **🔄 React Query Integration:** Efficient, robust frontend data fetching, caching, and mutation state management.
- **🔐 Session & Security:** JWT authentication (`rest_framework_simplejwt`) with automatic token injection and local storage persistence.
- **📊 Telemetry & Analytics:** Vercel Analytics & Speed Insights tracking for Core Web Vitals.
- **🛡️ Enterprise Quality Gates:** Ruff Python Linter and 100% passing Pytest suite integrated into **GitHub Actions CI/CD**.

---

## 📁 Repository Structure

```text
studybuddy/
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI pipeline (Ruff + Pytest + ESLint)
├── frontend/                  # React + Tailwind CSS UI
│   ├── public/
│   ├── src/
│   │   ├── components/       # UI components (Layout, Navbar, PageHeader, Card, etc.)
│   │   ├── pages/            # Explain, Summarize, Quiz, Flashcards, Chat, Auth
│   │   ├── context/          # AuthContext for session management
│   │   ├── utils/            # api.js (Axios instance with JWT interceptor)
│   │   ├── App.jsx           # Routing & React Query provider
│   │   └── index.css         # Tailwind directives & custom CSS
│   └── package.json
│
├── backend/                   # Django REST Framework API
│   ├── studybuddy/           # Project config (settings.py, urls.py, wsgi.py)
│   ├── study_api/            # API views, serializers, groq_client.py, tests/
│   │   ├── groq_client.py    # Groq API client integration
│   │   └── tests/            # Pytest suite for views & Groq client
│   ├── build.sh              # Build script for Render deployment
│   ├── manage.py
│   ├── pytest.ini
│   ├── requirements.txt
│   └── .env                  # Backend environment variables (GROQ_API_KEY, GROQ_MODEL)
│
├── render.yaml                # Render Blueprint (Infrastructure-as-Code)
├── PROJECT_STATUS.md          # Detailed engineering ledger & roadmap
├── .gitignore
└── README.md
```

---

## ⚙️ 1. Backend Setup

### Prerequisites
- Python 3.12+ installed
- Free Groq API Key from [console.groq.com](https://console.groq.com)

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
SECRET_KEY=django-insecure-development-key-change-in-prod
DEBUG=True
EOT

# Apply database migrations & setup cache table
python manage.py migrate
python manage.py createcachetable

# Start Django development server
python manage.py runserver
```

Backend server runs at: **`http://localhost:8000`**

---

## 💻 2. Frontend Setup

```bash
cd frontend

# Install Node modules
npm install

# Start React development server
npm start
```

Frontend application runs at: **`http://localhost:3000`**

---

## 🧪 3. Running Quality Checks & Tests

### Backend Tests & Linting
```bash
cd backend

# Run Pytest suite (13 isolated unit tests)
pytest

# Run Ruff code format & lint checks
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

---

## 📡 API Endpoints Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register/` | Public | Register a new user account |
| `POST` | `/api/auth/token/` | Public | Obtain JWT access and refresh tokens |
| `POST` | `/api/auth/token/refresh/` | Public | Refresh expired JWT access token |
| `POST` | `/api/explain/` | JWT | Generate topic explanation (Cached 7 days) |
| `POST` | `/api/summarize/` | JWT | Summarize study notes (Cached 7 days) |
| `POST` | `/api/quiz/` | JWT | Generate multiple-choice quiz (Cached 7 days) |
| `POST` | `/api/flashcards/` | JWT | Create study flashcards (Cached 7 days) |
| `POST` | `/api/chat/` | JWT | Multi-turn study assistant chat |
| `POST` | `/api/chat/stream/` | JWT | Real-time Server-Sent Events (SSE) streaming chat |

---

## 🚀 4. Deployment

### Backend (Render)
1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Select **New +** > **Blueprint**.
3. Connect this GitHub repository (`ikramhamid2003/studybuddy`).
4. Render automatically processes [`render.yaml`](file:///e:/studybuddy/render.yaml) to deploy the PostgreSQL database and Django web service.
5. Set `GROQ_API_KEY` in your Render Environment Variables.

### Frontend (Vercel)
1. Connect the `frontend/` directory to Vercel.
2. Set `REACT_APP_API_URL` to your deployed Render backend URL.
3. Deploy!

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
