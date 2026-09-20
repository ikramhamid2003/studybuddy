import { Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { getPrimaryGradient } from "../utils/routeColors";

const BUTTON_COLORS = {
  amber: {
    primary: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:shadow-[0_4px_28px_rgba(245,158,11,0.5)]",
    secondary: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20",
    ghost: "bg-transparent hover:bg-amber-500/10 text-amber-400/70 hover:text-amber-400",
    focus: "focus-visible:ring-amber-400/50",
  },
  emerald: {
    primary: "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-[0_4px_20px_rgba(16,185,129,0.35)] hover:shadow-[0_4px_28px_rgba(16,185,129,0.5)]",
    secondary: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20",
    ghost: "bg-transparent hover:bg-emerald-500/10 text-emerald-400/70 hover:text-emerald-400",
    focus: "focus-visible:ring-emerald-400/50",
  },
  violet: {
    primary: "bg-gradient-to-r from-violet-700 to-violet-600 hover:from-violet-600 hover:to-violet-500 text-white shadow-[0_4px_20px_rgba(139,92,246,0.35)] hover:shadow-[0_4px_28px_rgba(139,92,246,0.5)]",
    secondary: "bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20",
    ghost: "bg-transparent hover:bg-violet-500/10 text-violet-400/70 hover:text-violet-400",
    focus: "focus-visible:ring-violet-400/50",
  },
  sky: {
    primary: "bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white shadow-[0_4px_20px_rgba(14,165,233,0.35)] hover:shadow-[0_4px_28px_rgba(14,165,233,0.5)]",
    secondary: "bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20",
    ghost: "bg-transparent hover:bg-sky-500/10 text-sky-400/70 hover:text-sky-400",
    focus: "focus-visible:ring-sky-400/50",
  },
  rose: {
    primary: "bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-[0_4px_20px_rgba(244,63,94,0.35)] hover:shadow-[0_4px_28px_rgba(244,63,94,0.5)]",
    secondary: "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20",
    ghost: "bg-transparent hover:bg-rose-500/10 text-rose-400/70 hover:text-rose-400",
    focus: "focus-visible:ring-rose-400/50",
  },
  fuchsia: {
    primary: "bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 text-white shadow-[0_4px_20px_rgba(217,70,239,0.35)] hover:shadow-[0_4px_28px_rgba(217,70,239,0.5)]",
    secondary: "bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20",
    ghost: "bg-transparent hover:bg-fuchsia-500/10 text-fuchsia-400/70 hover:text-fuchsia-400",
    focus: "focus-visible:ring-fuchsia-400/50",
  },
};

export default function Button({
  children,
  onClick,
  disabled,
  loading,
  variant = "primary",
  size = "md",
  color,
  className = "",
  type = "button",
  ...props
}) {
  const location = useLocation();
  const path = location.pathname;

  // Use explicit color prop if provided, otherwise fall back to route-based colors
  const colorTheme = color ? BUTTON_COLORS[color] : null;

  const selectedPrimary = colorTheme?.primary || getPrimaryGradient(path);
  const focusColor = colorTheme?.focus || "focus-visible:ring-amber-400/50";

  // Variant and size maps keep call sites small and consistent.
  const variants = {
    primary: `${selectedPrimary} font-bold border-none relative overflow-hidden transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.99]`,
    secondary: colorTheme?.secondary || "bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 shadow-sm",
    ghost: colorTheme?.ghost || "bg-transparent hover:bg-slate-900 text-slate-400 hover:text-white",
    danger:
      "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20",
    success:
      "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20",
  };

  const sizes = {
    sm: "px-3.5 py-2 text-xs rounded-xl",
    md: "px-5 py-3 text-sm rounded-xl",
    lg: "px-7 py-3.5 text-base rounded-2xl",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 transition-all duration-200 font-body
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        focus-visible:outline-none focus-visible:ring-2 ${focusColor} focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
{/* Loading state shows "Logging in" text with spinner, or custom loadingText */}
  {loading ? (
    <span className="flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm font-medium">Logging in</span>
    </span>
  ) : children}
      {/* Shimmer overlay for primary variant */}
      {variant === "primary" && !loading && !disabled && (
        <span className="absolute inset-0 overflow-hidden rounded-inherit pointer-events-none btn-shimmer" aria-hidden="true" />
      )}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  variant: PropTypes.oneOf(["primary", "secondary", "ghost", "danger", "success"]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  color: PropTypes.oneOf(["amber", "emerald", "violet", "sky", "rose", "fuchsia"]),
  className: PropTypes.string,
  type: PropTypes.string,
};
