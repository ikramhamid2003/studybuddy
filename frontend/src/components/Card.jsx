import PropTypes from "prop-types";

export default function Card({ children, className = "", accent = null, hover = false, variant = "default", onClick }) {
  // Accent keys match the app's tool colors and add a subtle left border.
  const accentMap = {
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400 border-l-2 border-solid",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 border-l-2 border-solid",
    violet: "bg-violet-500/10 border-violet-500/20 text-violet-400 border-l-2 border-solid",
    sky: "bg-sky-500/10 border-sky-500/20 text-sky-400 border-l-2 border-solid",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-400 border-l-2 border-solid",
    fuchsia: "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400 border-l-2 border-solid",
  };

  const variantMap = {
    default: "rounded-xl p-6 bg-slate-950 border border-slate-700/60 transition-all duration-300 hover:bg-slate-900/80 hover:border-amber-500/20",
    elevated: "rounded-xl p-6 bg-slate-900/80 border border-slate-700/50 shadow-sm hover:bg-slate-900/90 transition-all duration-300",
    outlined: "rounded-xl p-6 bg-transparent border border-slate-700/50 hover:bg-slate-900/50 transition-all duration-300",
    glass: "rounded-xl p-6 bg-white/5 border border-white/10 hover:bg-slate-900/20 transition-all duration-300",
  };

  const isClickable = typeof onClick === "function";

  return (
    // Card is intentionally visual-only; callers decide whether it is clickable.
    <div
      onClick={onClick}
      className={`
        ${variantMap[variant] || variantMap.default}
        ${accent ? accentMap[accent] : ""}
        ${hover && isClickable ? "hover:border-slate-600 cursor-pointer transform hover:-translate-y-0.5" : ""}
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

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  accent: PropTypes.oneOf(["amber", "emerald", "violet", "sky", "rose", "fuchsia"]),
  hover: PropTypes.bool,
  variant: PropTypes.oneOf(["default", "elevated", "outlined", "glass"]),
  onClick: PropTypes.func,
};
