import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Sparkles,
  FileText,
  MessageSquare,
  ArrowRight,
  Zap,
  Layers,
  LayoutGrid,
  Star,
  Shield,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const tools = [
  {
    to: "/explain",
    label: "Explain",
    description: "Break down any concept into clear, structured explanations with analogies and examples.",
    icon: BookOpen,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  {
    to: "/quiz",
    label: "Quiz",
    description: "Auto-generate multiple-choice tests with step-by-step answer explanations.",
    icon: Zap,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  {
    to: "/chat",
    label: "AI Tutor",
    description: "Converse with a streaming AI study assistant. Sessions are saved automatically.",
    icon: MessageSquare,
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
  {
    to: "/summarize",
    label: "Summarize",
    description: "Transform notes or texts into concise, structured outlines instantly.",
    icon: FileText,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  {
    to: "/flashcards",
    label: "Flashcards",
    description: "Generate spaced-repetition card decks you can export to Anki or Quizlet.",
    icon: Layers,
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
  },
  {
    to: "/all",
    label: "All History",
    description: "Browse and manage all your past AI-generated study content in one place.",
    icon: LayoutGrid,
    color: "text-fuchsia-600",
    bg: "bg-fuchsia-50",
    border: "border-fuchsia-200",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  function handleCTA() {
    if (user) navigate("/explain");
    else navigate("/login");
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-base">StudyBuddy</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => navigate("/explain")}
                className="btn-primary text-sm"
              >
                Open Workspace
                <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="btn-secondary text-sm"
                >
                  Sign in
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="btn-primary text-sm"
                >
                  Get started free
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-full text-xs text-indigo-700 font-medium mb-8">
          <Sparkles size={12} className="text-indigo-500" />
          Powered by Groq LLM — Instant Inference
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-slate-900 leading-tight tracking-tight mb-6">
          Your AI-powered{" "}
          <span className="text-indigo-600">study workspace</span>
        </h1>

        <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          Explain concepts, generate quizzes, create flashcard decks, summarize notes, and chat with an AI tutor — all in one clean, distraction-free workspace.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={handleCTA}
            className="btn-primary px-7 py-3 text-base rounded-xl shadow-md shadow-indigo-200"
          >
            {user ? "Go to Workspace" : "Start learning — free"}
            <ArrowRight size={16} />
          </button>
          {!user && (
            <button
              onClick={() => navigate("/login")}
              className="btn-secondary px-7 py-3 text-base rounded-xl"
            >
              Sign in
            </button>
          )}
        </div>

        {/* Trust row */}
        <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-slate-400">
          <div className="flex items-center gap-1.5">
            <Shield size={14} className="text-emerald-500" />
            JWT-secured sessions
          </div>
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-amber-500" />
            Streaming inference
          </div>
          <div className="flex items-center gap-1.5">
            <Star size={14} className="text-indigo-400" />
            Free to use
          </div>
        </div>
      </section>

      {/* ── Tool grid ── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Everything you need to study smarter</h2>
          <p className="text-slate-500 text-base">Six AI-powered tools, all in one workspace.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map(({ to, label, description, icon: Icon, color, bg, border }) => (
            <div
              key={to}
              onClick={() => navigate(user ? to : "/login")}
              className={`group relative bg-white border ${border} rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
            >
              <div className={`w-10 h-10 rounded-xl ${bg} ${border} border flex items-center justify-center mb-4`}>
                <Icon className={color} size={18} />
              </div>
              <h3 className="text-slate-900 font-semibold text-base mb-1.5">{label}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
              <div className={`mt-4 flex items-center text-xs font-medium ${color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                Open {label} <ChevronRight size={13} className="ml-1" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
            Ready to study smarter?
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto mb-8">
            Create a free account and unlock the full StudyBuddy workspace in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleCTA}
              className="btn-primary px-7 py-3 text-base rounded-xl shadow-md shadow-indigo-200"
            >
              {user ? "Go to Workspace" : "Create free account"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-slate-600 text-sm font-medium">StudyBuddy AI</span>
          </div>
          <p className="text-slate-400 text-xs">
            Built with LangChain · Groq · Django · React
          </p>
        </div>
      </footer>
    </div>
  );
}
