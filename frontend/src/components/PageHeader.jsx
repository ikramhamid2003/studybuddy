import { useLocation } from "react-router-dom";

const accentLines = {
  "/all": "from-fuchsia-500/50 via-fuchsia-500/10 to-transparent",
  "/explain": "from-amber-500/50 via-amber-500/10 to-transparent",
  "/summarize": "from-emerald-500/50 via-emerald-500/10 to-transparent",
  "/quiz": "from-violet-500/50 via-violet-500/10 to-transparent",
  "/flashcards": "from-sky-500/50 via-sky-500/10 to-transparent",
  "/chat": "from-rose-500/50 via-rose-500/10 to-transparent",
};

const accentBg = {
  "/all": "from-fuchsia-500/10 via-fuchsia-500/5 to-transparent",
  "/explain": "from-amber-500/10 via-amber-500/5 to-transparent",
  "/summarize": "from-emerald-500/10 via-emerald-500/5 to-transparent",
  "/quiz": "from-violet-500/10 via-violet-500/5 to-transparent",
  "/flashcards": "from-sky-500/10 via-sky-500/5 to-transparent",
  "/chat": "from-rose-500/10 via-rose-500/5 to-transparent",
};

export default function PageHeader({ icon, title, subtitle }) {
  const location = useLocation();
  // The underline follows the current route, giving each tool a recognizable
  // accent while keeping the header component reusable.
  const activeLine = accentLines[location.pathname] || "from-amber-500/50 via-amber-500/10 to-transparent";
  const activeBg = accentBg[location.pathname] || "from-amber-500/10 via-amber-500/5 to-transparent";

  return (
    <div className="mb-10 animate-fade-up relative">
      {/* Subtle accent background glow */}
      <div className={`absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-r ${activeBg} rounded-2xl pointer-events-none -z-10 opacity-50`} />
      {/* Header content is supplied by each page; color is inferred from route. */}
      <div className="flex items-center gap-4 mb-3 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-center text-2xl shadow-inner backdrop-blur-md">
          {icon}
        </div>
        <div>
          <h2 className="font-display text-3xl font-extrabold text-white tracking-tight">{title}</h2>
          <p className="text-slate-400 text-xs font-light font-body mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className={`mt-5 h-[1.5px] bg-gradient-to-r ${activeLine} relative z-10`} />
    </div>
  );
}
