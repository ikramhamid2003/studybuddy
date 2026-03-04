# 📚 StudyBuddy AI — Full Stack

DEPLOYMENT LINK:
https://studybuddy-omega-gray.vercel.app/

> AI-powered study tool with Explain, Summarize, Quiz, Flashcards, and Chat.  
> **Stack:** React + Tailwind CSS · Django REST Framework · Hugging Face (free)

---

## Project Structure

```
studybuddy/
├── frontend/                 # React + Tailwind CSS
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx       # Sidebar + mobile nav
│   │   │   ├── PageHeader.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx        # Input, Textarea, Select
│   │   │   └── LoadingSkeleton.jsx
│   │   ├── pages/
│   │   │   ├── ExplainPage.jsx
│   │   │   ├── SummarizePage.jsx
│   │   │   ├── QuizPage.jsx
│   │   │   ├── FlashcardsPage.jsx
│   │   │   └── ChatPage.jsx
│   │   ├── utils/
│   │   │   └── api.js           # Axios client
│   │   ├── App.jsx
│   │   ├── index.js
│   │   └── index.css            # Tailwind directives + custom
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env
│   └── package.json
│
├── backend/                  # Django REST Framework
│   ├── studybuddy/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── study_api/
│   │   ├── hf_client.py        # Hugging Face API helper
│   │   ├── serializers.py      # DRF input validation
│   │   ├── views.py            # 5 API endpoints
│   │   └── urls.py
│   ├── manage.py
│   ├── requirements.txt
│   └── .env                    # ← Add your HF key here
│
├── .gitignore
└── README.md
```

---

## 1. Get Your Free Hugging Face Token

1. Go to **[huggingface.co](https://huggingface.co)** → Sign up (free)
2. Go to **Settings → Access Tokens → New Token**
3. Name it anything, Role: **Read** → **Generate Token**
4. Copy your token (starts with `hf_...`)

---

## 2. Backend Setup

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
# Edit .env and set HF_API_KEY=hf_your_token_here

# Run migrations
python manage.py migrate

# Start server
python manage.py runserver
```

Backend runs at: **http://localhost:8000**

---

## 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm start
```

Frontend runs at: **http://localhost:3000**

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/explain/` | Explain a topic |
| POST | `/api/summarize/` | Summarize notes |
| POST | `/api/quiz/` | Generate quiz |
| POST | `/api/flashcards/` | Generate flashcards |
| POST | `/api/chat/` | Chat with AI tutor |

### Example Requests

**Explain:**
```json
POST /api/explain/
{ "topic": "Photosynthesis", "level": "beginner" }
```

**Quiz:**
```json
POST /api/quiz/
{ "topic": "World War II", "num_questions": 5, "difficulty": "medium" }
```

**Chat:**
```json
POST /api/chat/
{ "message": "What is gravity?", "history": [] }
```

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

---

## GitHub Upload

```bash
cd studybuddy   # project root

git init
git add .
git commit -m "Initial commit: StudyBuddy AI full stack"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/studybuddy.git
git branch -M main
git push -u origin main
```

> ⚠️ The `.gitignore` excludes `.env` files. Never commit your API keys.

---

## Notes

- **HF Free Tier**: ~1,000 requests/day. Model cold-start can take 20–30s on first request.
- **Rate limiting**: DRF throttles at 60 requests/hour per IP to protect your quota.
- **Switch models**: Change `HF_MODEL` in `.env` to use any HF text-generation model.
