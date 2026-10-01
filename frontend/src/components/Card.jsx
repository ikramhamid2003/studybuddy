import PropTypes from "prop-types";

export default function Card({ children, className = "", accent = null, hover = false, variant = "default", onClick }) {
  // Accent keys match the app's tool colors and add a subtle left border.
  const accentMap = {
    amber: "bg-amber-50 border-amber-200 text-amber-700 border-l-2 border-solid",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700 border-l-2 border-solid",
    violet: "bg-violet-50 border-violet-200 text-violet-700 border-l-2 border-solid",
    sky: "bg-sky-50 border-sky-200 text-sky-700 border-l-2 border-solid",
    rose: "bg-rose-50 border-rose-200 text-rose-700 border-l-2 border-solid",
    fuchsia: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700 border-l-2 border-solid",
  };

  const variantMap = {
    default: "rounded-xl p-6 bg-white border border-slate-200 transition-all duration-300 hover:bg-slate-50 hover:border-slate-300",
    elevated: "rounded-xl p-6 bg-white border border-slate-200 card-elevated transition-all duration-300",
    outlined: "rounded-xl p-6 bg-transparent border border-slate-200 hover:bg-slate-50 transition-all duration-300",
    glass: "glass-surface rounded-xl p-6 transition-all duration-300 hover:bg-white/80",
  };

  const isClickable = typeof onClick === "function";

  return (
    // Card is intentionally visual-only; callers decide whether it is clickable.
    <div
      onClick={onClick}
      className={`
        ${variantMap[variant] || variantMap.default}
        ${accent ? accentMap[accent] : ""}
        ${hover && isClickable ? "hover:border-slate-300 cursor-pointer transform hover:-translate-y-0.5" : ""}
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
