export default function Card({ children, className = "", accent = null, hover = false, onClick }) {
  const accentMap = {
    amber: "border-l-amber-500 hover:border-amber-500/50 hover:shadow-[0_0_25px_rgba(245,158,11,0.12)]",
    emerald: "border-l-emerald-500 hover:border-emerald-500/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.12)]",
    violet: "border-l-violet-500 hover:border-violet-500/50 hover:shadow-[0_0_25px_rgba(139,92,246,0.12)]",
    sky: "border-l-sky-500 hover:border-sky-500/50 hover:shadow-[0_0_25px_rgba(14,165,233,0.12)]",
    rose: "border-l-rose-500 hover:border-rose-500/50 hover:shadow-[0_0_25px_rgba(244,63,94,0.12)]",
  };

  return (
    <div
      onClick={onClick}
      className={`
        backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-card transition-all duration-300
        ${accent ? `border-l-4 ${accentMap[accent] || "border-l-amber-500"}` : ""}
        ${hover ? "hover:border-slate-700 hover:shadow-card-hover cursor-pointer transform hover:-translate-y-1" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
