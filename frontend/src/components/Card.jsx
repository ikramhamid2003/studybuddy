export default function Card({ children, className = "", accent = null, hover = false, variant = "default", onClick }) {
  // Accent keys match the app's tool colors and add a subtle left border.
  const accentMap = {
    amber: "border-l-amber-500 hover:border-amber-500/50 hover:shadow-[0_0_25px_rgba(245,158,11,0.12)]",
    emerald: "border-l-emerald-500 hover:border-emerald-500/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.12)]",
    violet: "border-l-violet-500 hover:border-violet-500/50 hover:shadow-[0_0_25px_rgba(139,92,246,0.12)]",
    sky: "border-l-sky-500 hover:border-sky-500/50 hover:shadow-[0_0_25px_rgba(14,165,233,0.12)]",
    rose: "border-l-rose-500 hover:border-rose-500/50 hover:shadow-[0_0_25px_rgba(244,63,94,0.12)]",
    fuchsia: "border-l-fuchsia-500 hover:border-fuchsia-500/50 hover:shadow-[0_0_25px_rgba(217,70,239,0.12)]",
  };

  const variantMap = {
    default: "backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-card transition-all duration-300",
    elevated: "backdrop-blur-md bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300",
    outlined: "bg-transparent border border-slate-700/50 rounded-2xl p-6 transition-all duration-300 hover:border-slate-600/50",
    glass: "backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 transition-all duration-300",
  };

  const isClickable = typeof onClick === "function";

  return (
    // Card is intentionally visual-only; callers decide whether it is clickable.
    <div
      onClick={onClick}
      className={`
        ${variantMap[variant] || variantMap.default}
        ${accent ? `border-l-4 ${accentMap[accent] || "border-l-amber-500"}` : ""}
        ${hover && isClickable ? "hover:border-slate-700 hover:shadow-card-hover cursor-pointer transform hover:-translate-y-1" : ""}
        ${isClickable ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950" : ""}
        ${className}
      `}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }} : undefined}
    >
      {children}
    </div>
  );
}
