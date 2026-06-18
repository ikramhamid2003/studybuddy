# 📚 StudyBuddy AI — Full Stack

DEPLOYMENT LINK:
https://studybuddy-omega-gray.vercel.app/

> AI-powered study tool with Explain, Summarize, Quiz, Flashcards, and Chat.  
> **Stack:** React (Vite/CRA) + Tailwind CSS · Django REST Framework · Groq (LLM API)

---

## ✨ Features
- **Explain, Summarize, Quiz, Flashcards, and Chat** powered by fast Groq LLMs.
- **Database Caching:** Identical requests are cached in the Django SQLite database to save API costs and reduce latency.
- **React Query:** Efficient, robust data fetching and state management on the frontend.
- **Flashcards CSV Export:** Download your flashcards to instantly import them into Anki.
- **Text-to-Speech (TTS):** The AI Chatbot can read its responses aloud using native browser Web Speech API.
- **Vercel Analytics & Speed Insights:** Monitor traffic and Core Web Vitals directly on Vercel.
- **Render Ready:** Includes a `render.yaml` Blueprint for 1-click backend deployment.

---

## Project Structure

```
studybuddy/
├── frontend/                 # React + Tailwind CSS
│   ├── public/
│   ├── src/
│   │   ├── components/      # UI components (Layout, PageHeader, Card, etc.)
│   │   ├── pages/           # Explain, Summarize, Quiz, Flashcards, Chat
│   │   ├── utils/           # api.js
│   │   ├── App.jsx          # Routes, React Query Provider, Analytics
│   │   └── index.css        # Tailwind directives + custom CSS
│   └── package.json
│
├── backend/                  # Django REST Framework
│   ├── studybuddy/          # Project config (settings.py, urls.py)
│   ├── study_api/           # API Views, Serializers, hf_client.py
│   ├── build.sh             # Build script for Render
│   ├── requirements.txt
│   └── .env                 # ← Add your GROQ_API_KEY here
│
├── render.yaml               # Render Infrastructure-as-Code Blueprint
├── .gitignore
└── README.md
```

## 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env .env.backup             # optional
# Edit .env and set GROQ_API_KEY=gsk_your_token_here

# Run migrations and setup cache table
python manage.py migrate
python manage.py createcachetable

# Start server
python manage.py runserver
```

Backend runs at: **http://localhost:8000**

---

## 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm start
```

Frontend runs at: **http://localhost:3000**

---

## 3. Deploy to Render (Backend)
1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Blueprint**.
3. Connect this GitHub repository.
4. Render reads `render.yaml` and deploys the PostgreSQL database and Django Web Service.
5. Provide your `GROQ_API_KEY` when prompted.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/explain/` | Explain a topic |
| POST | `/api/summarize/` | Summarize notes |
| POST | `/api/quiz/` | Generate quiz |
| POST | `/api/flashcards/` | Generate flashcards |
| POST | `/api/chat/` | Chat with AI tutor |

*All generation endpoints automatically cache their results for 7 days.*

---

## Tailwind Features Used

- Dark theme with `slate-950` / `slate-900` palette
- Custom fonts: Playfair Display (headings) + DM Sans (body) + JetBrains Mono (code)
- Custom `glow` shadows and `grid-pattern` background
- 3D flashcard flip with `perspective` + `preserve-3d` via custom CSS classes
- Typing indicator animation with keyframes
- Shimmer loading skeleton animation
- `animate-fade-up`, `animate-fade-in` custom keyframes
- Responsive sidebar with `lg:translate-x-0` toggle
