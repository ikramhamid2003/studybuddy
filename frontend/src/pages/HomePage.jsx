import { useNavigate } from "react-router-dom";
import { BookOpen, Sparkles, FileText, CheckSquare, MessageSquare, ArrowRight, ShieldCheck, Zap, Volume2 } from "lucide-react";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  function handleCTA() {
    if (user) {
      navigate("/explain");
    } else {
      navigate("/register");
    }
  }

  return (
    <div className="relative space-y-28 pb-24 overflow-hidden min-h-screen">
      {/* Dynamic Animated Atmospheric Blur Dots */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] animate-float opacity-50 pointer-events-none" />
      <div className="absolute top-[20%] right-[-100px] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[160px] animate-float-reverse opacity-40 pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-150px] w-[550px] h-[550px] bg-emerald-500/5 rounded-full blur-[130px] animate-float opacity-30 pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[10%] w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[120px] animate-float-reverse opacity-45 pointer-events-none" />

      {/* Hero Section */}
      <section className="text-center py-20 space-y-8 max-w-4xl mx-auto animate-fade-in relative z-10">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-slate-900/60 border border-slate-800/80 rounded-full text-xs text-amber-300 font-semibold font-mono uppercase tracking-widest shadow-[0_0_20px_rgba(251,191,36,0.03)] backdrop-blur-md">
          <Sparkles size={14} className="text-amber-400 animate-pulse" />
          The Future of Learning is Here
        </div>
        
        <h1 className="text-5xl md:text-8xl font-black tracking-tight text-white leading-none font-display">
          Study Smarter, <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-400 to-violet-500 filter drop-shadow-[0_2px_20px_rgba(251,191,36,0.15)]">Not Harder.</span>
        </h1>
        
        <p className="text-slate-400 text-lg md:text-2xl max-w-2xl mx-auto leading-relaxed font-body font-light">
          Supercharge your study routine. Instantly break down complex topics, summarize dense notes, auto-generate quizzes, and review with spaced-repetition card decks.
        </p>

        <div className="flex flex-col sm:flex-row gap-5 justify-center items-center pt-8">
          <Button onClick={handleCTA} size="lg" className="px-10 py-4 shadow-[0_4px_20px_rgba(251,191,36,0.25)] hover:shadow-[0_4px_30px_rgba(251,191,36,0.4)] bg-gradient-to-r from-amber-400 via-amber-350 to-amber-400 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-bold border-none transition-all duration-300 transform hover:scale-[1.04] rounded-2xl flex items-center">
            {user ? "Go to Workspace" : "Start Learning Free"}
            <ArrowRight size={18} className="ml-2 animate-bounce-horizontal" />
          </Button>
          {!user && (
            <Button onClick={() => navigate("/login")} variant="outline" size="lg" className="px-10 py-4 border-slate-800 hover:border-slate-600 hover:bg-slate-900/60 text-slate-300 hover:text-white backdrop-blur-md transition-all duration-300 transform hover:scale-[1.04] rounded-2xl">
              Sign In
            </Button>
          )}
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section className="space-y-16 animate-fade-up relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white font-display tracking-tight">MAANG-Grade Study Suite</h2>
          <p className="text-slate-400 text-base font-light">Explore a unified toolkit engineered to maximize active recall and cognitive retention.</p>
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Explain Concept (Col Span 2) */}
          <div
            onClick={() => navigate(user ? "/explain" : "/login")}
            className="md:col-span-2 relative group overflow-hidden backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 hover:border-amber-500/40 hover:shadow-[0_0_30px_rgba(245,158,11,0.08)] transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4 max-w-md">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shadow-inner mb-2">
                <BookOpen size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white font-display">AI Concept Explanations</h3>
              <p className="text-slate-400 text-sm font-light leading-relaxed">
                Break down any complex academic concept instantly. Tailor descriptions to your current skill level using real-world analogies and concrete code/case examples.
              </p>
            </div>

            {/* Interactive Mockup */}
            <div className="mt-8 bg-slate-950/80 border border-slate-800/60 rounded-2xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-3 mb-3">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-slate-500 font-mono ml-2">EXPLAINER TOOL v1.0</span>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="text-xs px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-300 font-semibold">Quantum Physics</div>
                  <div className="text-xs px-2.5 py-1 bg-slate-850 border border-slate-800 rounded-md text-slate-400">Beginner Level</div>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-850/60 text-[11px] leading-relaxed text-slate-300">
                  <span className="text-amber-400 font-semibold font-mono">Analogy:</span> Imagine spinning a coin on a table. While it's spinning, it is both Heads and Tails at the same time. Only when you slap your hand down on the coin does it choose one state...
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex items-center text-xs font-semibold uppercase tracking-wider text-amber-400 group-hover:text-amber-300">
              Launch Explainer <ArrowRight size={14} className="ml-2 transition-transform group-hover:translate-x-1.5" />
            </div>
          </div>

          {/* Card 2: Interactive Quiz (Col Span 1) */}
          <div
            onClick={() => navigate(user ? "/quiz" : "/login")}
            className="relative group overflow-hidden backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 hover:border-violet-500/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.08)] transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-inner mb-2">
                <CheckSquare size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white font-display">Interactive Quizzes</h3>
              <p className="text-slate-400 text-sm font-light leading-relaxed">
                Generate custom multiple-choice tests instantly. Get immediate step-by-step reasoning behind every correct or wrong option.
              </p>
            </div>

            {/* Interactive Mockup */}
            <div className="mt-8 bg-slate-950/80 border border-slate-800/60 rounded-2xl p-4 shadow-2xl space-y-3 font-body text-[11px]">
              <div className="text-slate-300 font-semibold">Q1: Which sorting algorithm is O(n log n) in the worst-case?</div>
              <div className="space-y-2">
                <div className="p-2 bg-slate-900/60 border border-slate-850 rounded-lg text-slate-400 flex justify-between">
                  <span>A) Bubble Sort</span>
                </div>
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 flex justify-between items-center">
                  <span>B) Merge Sort</span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-[8px]">✓</span>
                </div>
                <div className="p-2 bg-slate-900/60 border border-slate-850 rounded-lg text-slate-400 flex justify-between">
                  <span>C) Quick Sort</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center text-xs font-semibold uppercase tracking-wider text-violet-400 group-hover:text-violet-300">
              Generate Quiz <ArrowRight size={14} className="ml-2 transition-transform group-hover:translate-x-1.5" />
            </div>
          </div>

          {/* Card 3: AI Chat Companion (Col Span 1) */}
          <div
            onClick={() => navigate(user ? "/chat" : "/login")}
            className="relative group overflow-hidden backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 hover:border-rose-500/40 hover:shadow-[0_0_30px_rgba(244,63,94,0.08)] transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner mb-2">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white font-display">Streaming AI Tutor</h3>
              <p className="text-slate-400 text-sm font-light leading-relaxed">
                Study with a conversational assistant. Answers stream token-by-token and can be spoken out loud instantly via web Speech Tools.
              </p>
            </div>

            {/* Interactive Mockup */}
            <div className="mt-8 bg-slate-950/80 border border-slate-800/60 rounded-2xl p-4 shadow-2xl space-y-3 font-mono text-[10px]">
              <div className="flex gap-2 justify-end">
                <div className="p-2 bg-slate-800 rounded-xl rounded-tr-none text-slate-200 text-right">What is recursion?</div>
              </div>
              <div className="flex gap-2">
                <div className="p-2 bg-rose-950/20 border border-rose-500/15 rounded-xl rounded-tl-none text-slate-300 text-left flex-1 relative">
                  <span>It is a function that calls itself...</span>
                  <Volume2 size={10} className="text-rose-400 absolute bottom-1 right-1.5" />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center text-xs font-semibold uppercase tracking-wider text-rose-400 group-hover:text-rose-300">
              Open Chat <ArrowRight size={14} className="ml-2 transition-transform group-hover:translate-x-1.5" />
            </div>
          </div>

          {/* Card 4: Note Summarizer & Flashcards (Col Span 2) */}
          <div
            onClick={() => navigate(user ? "/summarize" : "/login")}
            className="md:col-span-2 relative group overflow-hidden backdrop-blur-xl bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.08)] transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4 max-w-md">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner mb-2">
                <FileText size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white font-display">Summarizer & Flashcards</h3>
              <p className="text-slate-400 text-sm font-light leading-relaxed">
                Transform slides, reports, or text files into concise formatted outlines and key-value flashcards that you can export cleanly into external databases like Anki or Quizlet.
              </p>
            </div>

            {/* Interactive Mockup */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              {/* Left Side: Summarizer Mock */}
              <div className="bg-slate-950/80 border border-slate-800/60 rounded-2xl p-4 shadow-xl text-[10px] space-y-2">
                <div className="font-semibold text-emerald-400 border-b border-slate-900 pb-1.5 mb-1.5 uppercase font-mono tracking-wider">Key Concepts</div>
                <ul className="space-y-1.5 list-disc pl-3 text-slate-350 leading-relaxed font-body">
                  <li><span className="font-semibold text-slate-200">Active Recall:</span> Retrieving information actively.</li>
                  <li><span className="font-semibold text-slate-200">Spaced Repetition:</span> Expanding time intervals.</li>
                </ul>
              </div>
              {/* Right Side: Flashcard Flip Mock */}
              <div className="bg-slate-950/85 border border-slate-800/60 rounded-2xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-center text-[9px] font-mono text-slate-550 border-b border-slate-900 pb-1">
                  <span>FLASHCARD #12</span>
                  <span className="text-sky-400">FRONT</span>
                </div>
                <div className="text-center py-4 font-semibold text-slate-200 text-[11px] leading-snug">
                  What does a HTTP 401 Unauthorized code mean?
                </div>
                <div className="text-[8px] text-center text-slate-500 font-mono">Click card to reveal answer</div>
              </div>
            </div>

            <div className="mt-6 flex items-center text-xs font-semibold uppercase tracking-wider text-emerald-400 group-hover:text-emerald-300">
              Summarize Notes <ArrowRight size={14} className="ml-2 transition-transform group-hover:translate-x-1.5" />
            </div>
          </div>

        </div>
      </section>

      {/* Bottom Premium Callout */}
      <section className="relative z-10 max-w-4xl mx-auto px-4">
        <div className="bg-gradient-to-b from-slate-900/60 to-slate-950/90 border border-slate-850 rounded-[36px] p-12 md:p-16 text-center space-y-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Subtle decoration elements */}
          <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern bg-grid opacity-[0.02] pointer-events-none" />
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

          <h3 className="text-4xl md:text-5xl font-black text-white font-display tracking-tight">Upgrade Your Study Performance</h3>
          <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto font-body font-light leading-relaxed">
            Stop building flashcards by hand. Get high-fidelity outline summaries and interactive self-evaluation quizzes directly in one dashboard.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-slate-400 text-xs font-mono pt-3">
            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-850/80 px-4 py-2 rounded-full">
              <Zap size={14} className="text-amber-400 animate-pulse" />
              Llama 3.3 Streaming Inference
            </div>
            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-850/80 px-4 py-2 rounded-full">
              <ShieldCheck size={14} className="text-emerald-400" />
              Secure Token Session Auth
            </div>
          </div>
          <Button onClick={handleCTA} size="lg" className="px-12 py-4 shadow-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 border-none transition-all duration-300 transform hover:scale-[1.03] font-bold rounded-2xl mt-4">
            Initialize Free Workspace
          </Button>
        </div>
      </section>
    </div>
  );
}
