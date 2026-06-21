import { useNavigate } from "react-router-dom";
import { BookOpen, Sparkles, FileText, CheckSquare, Layers, MessageSquare, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: <BookOpen className="text-amber-400" size={24} />,
      title: "AI Concept Explanations",
      desc: "Get complicated topics explained to you at a beginner, intermediate, or advanced level instantly with real-world analogies and concrete examples.",
      link: "/explain",
    },
    {
      icon: <FileText className="text-emerald-400" size={24} />,
      title: "Note Summarizer",
      desc: "Paste your dense lecture slides or textbooks and condense them into structured bullet points, paragraphs, or reference outlines with key tips.",
      link: "/summarize",
    },
    {
      icon: <CheckSquare className="text-violet-400" size={24} />,
      title: "Interactive Practice Quizzes",
      desc: "Generate personalized multiple-choice questions on any topic to test your retention, complete with active reasoning and error correction details.",
      link: "/quiz",
    },
    {
      icon: <Layers className="text-sky-400" size={24} />,
      title: "Spaced Repetition Flashcards",
      desc: "Create front-and-back study decks. Once created, export them as a standard CSV format to import them directly into Anki or Quizlet.",
      link: "/flashcards",
    },
    {
      icon: <MessageSquare className="text-rose-400" size={24} />,
      title: "Real-Time Streaming Chat",
      desc: "Chat with a virtual study tutor. Watch responses render token-by-token (SSE streaming) and click to read answers aloud via text-to-speech.",
      link: "/chat",
    },
  ];

  function handleCTA() {
    if (user) {
      navigate("/explain");
    } else {
      navigate("/register");
    }
  }

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="text-center py-12 space-y-6 max-w-4xl mx-auto animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/10 border border-amber-400/20 rounded-full text-xs text-amber-300 font-medium font-mono uppercase tracking-wider mb-2">
          <Sparkles size={13} />
          Elevating Your Study Strategy
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
          Your Intelligent <span className="text-amber-400">AI Study Buddy</span>
        </h1>
        
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          Unlock MAANG-tier study tools to explain concepts, summarize dense notes, generate active-retention quizzes, and study with a streaming chat companion.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Button onClick={handleCTA} size="lg" className="px-8 shadow-lg shadow-amber-400/10">
            {user ? "Go to Dashboard" : "Start Studying Free"}
            <ArrowRight size={16} className="ml-2" />
          </Button>
          {!user && (
            <Button onClick={() => navigate("/login")} variant="outline" size="lg" className="px-8">
              Log In
            </Button>
          )}
        </div>
      </section>

      {/* Feature Grid */}
      <section className="space-y-8 animate-fade-up">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-bold text-white">Equipped with 5 Powerful AI Tools</h2>
          <p className="text-slate-400 text-sm">Everything you need to master your classes and ace your exams.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <Card
              key={i}
              hover
              accent="amber"
              onClick={() => navigate(user ? f.link : "/login")}
              className="flex flex-col h-full border-slate-800 hover:border-amber-400/40"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed flex-1">{f.desc}</p>
              <div className="mt-4 flex items-center text-xs text-amber-400 font-medium group cursor-pointer">
                Try this tool
                <ArrowRight size={12} className="ml-1.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Bottom Callout */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 md:p-12 text-center max-w-4xl mx-auto space-y-6">
        <h3 className="text-2xl md:text-3xl font-bold text-white">Join Thousands of Smart Students</h3>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          Save hundreds of hours condensing slide decks and creating manual practice sets. Get your personalized tutor online 24/7.
        </p>
        <div className="flex justify-center gap-8 text-slate-500 text-xs font-mono pt-2">
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-amber-400" />
            Fast Streaming Response
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            Safe & Free Telemetry
          </div>
        </div>
        <Button onClick={handleCTA} size="md" className="px-8 mt-2">
          Create Free Account
        </Button>
      </section>
    </div>
  );
}
