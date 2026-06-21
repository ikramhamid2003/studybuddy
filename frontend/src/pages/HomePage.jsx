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
      desc: "Get complicated topics broken down simply at beginner, intermediate, or advanced levels with rich real-world analogies and concrete examples.",
      link: "/explain",
      accent: "amber",
      textColor: "text-amber-400",
    },
    {
      icon: <FileText className="text-emerald-400" size={24} />,
      title: "Note Summarizer",
      desc: "Paste dense lecture slides, outlines, or books and condense them into beautifully formatted summaries, outlines, and key study tips.",
      link: "/summarize",
      accent: "emerald",
      textColor: "text-emerald-400",
    },
    {
      icon: <CheckSquare className="text-violet-400" size={24} />,
      title: "Interactive Quizzes",
      desc: "Generate custom multiple-choice quizzes on any topic instantly to test your retention, complete with active reasoning and error logs.",
      link: "/quiz",
      accent: "violet",
      textColor: "text-violet-400",
    },
    {
      icon: <Layers className="text-sky-400" size={24} />,
      title: "Spaced Flashcards",
      desc: "Instantly create active-recall study flashcard decks. Study them directly or export to CSV to use in Anki or Quizlet.",
      link: "/flashcards",
      accent: "sky",
      textColor: "text-sky-400",
    },
    {
      icon: <MessageSquare className="text-rose-400" size={24} />,
      title: "Streaming AI Chat",
      desc: "Interact with an online AI study tutor. Watch answers stream in real-time and read them out loud using audio speech tools.",
      link: "/chat",
      accent: "rose",
      textColor: "text-rose-400",
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
    <div className="relative space-y-24 pb-20 overflow-hidden min-h-screen">
      {/* Interactive Floating Neon Glowing Backdrops */}
      <div className="absolute top-0 left-10 w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[120px] animate-float opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 right-10 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px] animate-float-reverse opacity-40 pointer-events-none" />
      <div className="absolute bottom-20 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] animate-float opacity-30 pointer-events-none" />
      <div className="absolute bottom-5 right-20 w-[350px] h-[350px] bg-rose-500/5 rounded-full blur-[90px] animate-float-reverse opacity-30 pointer-events-none" />

      {/* Hero Section */}
      <section className="text-center py-16 space-y-8 max-w-4xl mx-auto animate-fade-in relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-amber-400/15 via-rose-400/15 to-violet-500/15 border border-amber-400/20 rounded-full text-xs text-amber-300 font-semibold font-mono uppercase tracking-widest mb-2 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
          <Sparkles size={13} className="text-amber-400 animate-pulse" />
          Elevating Your Study Strategy
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight font-display">
          Your Intelligent <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-400 to-violet-500 filter drop-shadow-[0_2px_15px_rgba(251,191,36,0.2)]">AI Study Buddy</span>
        </h1>
        
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-body">
          Unlock premium study tools to simplify concepts, summarize dense notes, generate active-retention quizzes, and learn from a streaming conversational companion.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
          <Button onClick={handleCTA} size="lg" className="px-8 shadow-lg bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-900 border-none transition-all duration-300 transform hover:scale-[1.02]">
            {user ? "Go to Dashboard" : "Start Studying Free"}
            <ArrowRight size={16} className="ml-2" />
          </Button>
          {!user && (
            <Button onClick={() => navigate("/login")} variant="outline" size="lg" className="px-8 border-slate-700 hover:border-amber-400/40 text-slate-300 hover:text-white backdrop-blur-sm bg-slate-900/40 transition-all duration-300 transform hover:scale-[1.02]">
              Log In
            </Button>
          )}
        </div>
      </section>

      {/* Feature Grid */}
      <section className="space-y-12 animate-fade-up relative z-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold text-white font-display">Equipped with 5 Powerful AI Tools</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">Everything you need to master complex topics, self-test, and accelerate your academic recall.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
          {features.map((f, i) => (
            <Card
              key={i}
              hover
              accent={f.accent}
              onClick={() => navigate(user ? f.link : "/login")}
              className="flex flex-col h-full hover:border-slate-600 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mb-5 shadow-inner">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2 font-display">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed flex-1 font-body">{f.desc}</p>
              <div className={`mt-5 flex items-center text-xs font-semibold uppercase tracking-wider ${f.textColor} group cursor-pointer`}>
                Launch Tool
                <ArrowRight size={14} className="ml-2 transition-transform group-hover:translate-x-1.5" />
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Bottom Callout */}
      <section className="relative z-10 max-w-4xl mx-auto px-4">
        <div className="bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-slate-800/80 rounded-3xl p-10 md:p-14 text-center space-y-8 backdrop-blur-lg shadow-2xl relative overflow-hidden">
          {/* Subtle inside glow */}
          <div className="absolute -top-12 -left-12 w-28 h-28 bg-amber-400/10 rounded-full blur-xl" />
          <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-violet-500/10 rounded-full blur-xl" />

          <h3 className="text-3xl font-bold text-white font-display">Join Thousands of Smart Students</h3>
          <p className="text-slate-400 text-base max-w-lg mx-auto font-body">
            Save hundreds of hours condensing slide decks, generating customized mock tests, and working with your virtual learning study buddy available 24/7.
          </p>
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-slate-400 text-xs font-mono pt-2">
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-full">
              <Zap size={14} className="text-amber-400 animate-pulse" />
              Llama 3.3 Streaming Response
            </div>
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-full">
              <ShieldCheck size={14} className="text-emerald-400" />
              Secure JWT Auth Config
            </div>
          </div>
          <Button onClick={handleCTA} size="lg" className="px-10 mt-4 shadow-lg shadow-amber-400/5 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 border-none transition-all duration-300 transform hover:scale-[1.02]">
            Create Free Account
          </Button>
        </div>
      </section>
    </div>
  );
}
