import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  FileSearch,
  FileText,
  Flame,
  Layers,
  LayoutGrid,
  MessageSquare,
  Quote,
  ShieldCheck,
  Sparkles,
  Target,
  Wand2,
  Zap,
} from "lucide-react";
import { routeIntent } from "../../utils/personalize";

const tools = [
  {
    label: "Explain",
    description: "Break any concept down at beginner, intermediate or advanced depth — with analogies and worked examples.",
    icon: BookOpen,
    text: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  {
    label: "Summarize",
    description: "Turn a wall of notes into bullets, a paragraph or an outline, with key terms and study tips pulled out.",
    icon: FileText,
    text: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  {
    label: "Quiz",
    description: "Multiple-choice tests at the difficulty you pick, each answer explained — not just marked right or wrong.",
    icon: Zap,
    text: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  {
    label: "Flashcards",
    description: "3D flip decks with hints, exportable to Anki as CSV so revision survives the browser tab.",
    icon: Layers,
    text: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
  },
  {
    label: "AI Tutor",
    description: "A streaming conversation that answers word by word and saves every session so you can pick it back up.",
    icon: MessageSquare,
    text: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
  {
    label: "Grounded in your uploads",
    description: "Every tool can read your PDF, TXT or MD notes. Tick them under any title and answers come back with citations.",
    icon: FileSearch,
    text: "text-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-200",
  },
];

const steps = [
  {
    title: "Say what you are studying",
    body: "One box at the top of your home page. Type a topic, a question, or “quiz me on chapter 4”.",
    icon: Wand2,
  },
  {
    title: "StudyBuddy picks the tool",
    body: "The router reads your intent and lands you in Explain, Quiz, Summarize, Flashcards, the tutor or your documents — with your text already filled in.",
    icon: Target,
  },
  {
    title: "Your home page adapts",
    body: "Every saved result feeds a streak, a 14-day activity chart, your tool mix, and next steps suggested from what you actually did.",
    icon: Flame,
  },
];

export default function HomeLanding() {
  const navigate = useNavigate();
  const [demo, setDemo] = useState("quiz me on photosynthesis");
  const intent = routeIntent(demo);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-base font-semibold tracking-tight text-slate-900">StudyBuddy</span>
          </div>
          <nav className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="btn-secondary rounded-xl px-4 py-2 text-sm"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="btn-primary rounded-xl px-4 py-2 text-sm"
            >
              Start free
            </button>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-hero-gradient" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-200/40 blur-4xl animate-float motion-reduce:animate-none" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-16 top-40 h-80 w-80 rounded-full bg-sky-200/40 blur-4xl animate-float-reverse motion-reduce:animate-none" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
              <Sparkles size={12} className="text-indigo-500" />
              Seven tools, one home page that adapts to you
            </span>

            <h1 className="font-display mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 text-balance sm:text-5xl lg:text-6xl">
              Study material that{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                meets you where you are
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Type what you are stuck on and StudyBuddy routes you to the right tool, grounds the answer in
              your own uploaded notes, and remembers what you did — so tomorrow's home page is not the same
              as today's.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="btn-primary justify-center rounded-xl px-7 py-3 text-base shadow-glow-sm"
              >
                Create free account <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="btn-secondary justify-center rounded-xl px-7 py-3 text-base"
              >
                I already have one
              </button>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              {[
                { icon: ShieldCheck, label: "JWT sessions" },
                { icon: Zap, label: "Streaming answers" },
                { icon: Quote, label: "Cited from your docs" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-1.5">
                  <Icon size={14} className="text-indigo-500" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Live router demo — the same function the real home page uses */}
          <div className="animate-fade-up rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-elevated backdrop-blur-sm sm:p-6">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              <Wand2 size={13} className="text-indigo-500" />
              Try the router
            </p>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5">
              <div className="flex items-center gap-2.5 px-3">
                <Sparkles size={15} className="shrink-0 text-indigo-500" />
                <input
                  value={demo}
                  onChange={(event) => setDemo(event.target.value)}
                  aria-label="Example study request"
                  placeholder="e.g. summarize my lecture notes"
                  className="w-full bg-transparent py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">
                Routes to
              </p>
              <p className="font-display mt-1 text-lg font-bold text-slate-900">
                {intent ? intent.label : "…"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {intent ? intent.reason : "Type something to see which tool it lands in."}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {["quiz me on mitosis", "make flashcards for chapter 2", "what does my PDF say about enzymes?", "explain the Krebs cycle"].map(
                (sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setDemo(sample)}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-700 motion-reduce:transition-none"
                  >
                    {sample}
                  </button>
                ),
              )}
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
              This is the real routing logic, not a mock — signed in, the same box opens that tool with your
              text already filled in.
            </p>
          </div>
        </div>
      </section>

      {/* ── Tools ── */}
      <section className="border-t border-slate-100 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 text-balance sm:text-4xl">
              Every tool a revision session needs
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Each one saves its result to your history, and each one can be grounded in documents you
              uploaded — tick them in the <span className="font-semibold text-slate-800">My documents</span>{" "}
              dropdown under any title and the answer comes back with citations.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map(({ label, description, icon: Icon, text, bg, border }) => (
              <div
                key={label}
                className="lift-hover group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${bg} ${border}`}>
                  <Icon className={text} size={18} />
                </div>
                <h3 className="font-display mt-4 text-base font-semibold text-slate-900">{label}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-t border-slate-100">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 text-balance sm:text-4xl">
            Personalized without a setup quiz
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
            Nothing to configure. The home page reads what you have actually saved — generations, chat
            sessions, uploaded documents, token usage — and builds itself from that.
          </p>

          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map(({ title, body, icon: Icon }, index) => (
              <li key={title} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="font-display absolute right-5 top-4 text-4xl font-bold text-slate-100">
                  {index + 1}
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50">
                  <Icon size={18} className="text-indigo-600" />
                </div>
                <h3 className="font-display mt-4 text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { label: "Day streak", detail: "Consecutive days with something saved — kept alive until a full day passes." },
              { label: "Tool mix", detail: "Which of the seven tools you actually use, as a share of everything saved." },
              { label: "Suggested next", detail: "Built from your last topic and the tools you have not tried on it yet." },
            ].map(({ label, detail }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <p className="font-display text-sm font-semibold text-slate-900">{label}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Grounding spotlight ── */}
      <section className="border-t border-slate-100 bg-indigo-950">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-indigo-100">
              <FileSearch size={12} />
              Retrieval-augmented, on your own notes
            </span>
            <h2 className="font-display mt-5 text-3xl font-bold leading-tight tracking-tight text-white text-balance sm:text-4xl">
              Answers that cite the page they came from
            </h2>
            <p className="mt-4 text-base leading-relaxed text-indigo-100/80">
              Upload a PDF, TXT or MD file and it is chunked, embedded and indexed. Retrieval runs over
              pgvector in Postgres with a numpy cosine fallback, so it works whether or not the extension is
              available. When your notes do not contain the answer, the model is told to say so rather than
              invent one.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-indigo-100/90">
              {[
                "Available in all seven tools, not just the documents page",
                "Selected documents become part of the cached prompt key, so two libraries never share an answer",
                "Documents must be yours and finished indexing before anything can retrieve from them",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <ChevronRight size={15} className="mt-0.5 shrink-0 text-indigo-300" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-300">
              Grounded answer
            </p>
            <p className="mt-3 text-sm leading-relaxed text-indigo-50">
              “Queen cells are built only when the colony intends to swarm or replace a failing queen…”
            </p>
            <div className="mt-4 space-y-2">
              {["beekeeping-notes.pdf · p.14", "hive-inspection-log.md · p.3"].map((source) => (
                <div
                  key={source}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-indigo-100"
                >
                  <FileText size={13} className="text-indigo-300" />
                  {source}
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-indigo-200/70">
              Illustrative excerpt. Ask something your notes do not cover and you get an honest “your notes
              do not mention that” instead of a confident guess.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-glow">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h2 className="font-display mt-6 text-3xl font-bold tracking-tight text-slate-900 text-balance sm:text-4xl">
            Your home page is waiting to learn you
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            Free account, no card. Save one result and the streak, activity chart and suggestions start
            filling in from your own work.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="btn-primary justify-center rounded-xl px-7 py-3 text-base shadow-glow-sm"
            >
              Create free account <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/all")}
              className="btn-secondary justify-center rounded-xl px-7 py-3 text-base"
            >
              <LayoutGrid size={16} />
              Browse all tools
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-600">StudyBuddy AI</span>
          </div>
          <p className="text-xs text-slate-400">
            Built with LangChain · Groq · Django · pgvector · React
          </p>
        </div>
      </footer>
    </div>
  );
}
