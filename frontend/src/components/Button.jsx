import { Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { getPrimaryGradient } from "../utils/routeColors";

export default function Button({
  children,
  onClick,
  disabled,
  loading,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}) {
  const location = useLocation();
  const path = location.pathname;

  const selectedPrimary = getPrimaryGradient(path);

  // Variant and size maps keep call sites small and consistent.
  const variants = {
    primary: `${selectedPrimary} font-bold border-none relative overflow-hidden transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.99]`,
    secondary:
      "bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 shadow-sm",
    ghost:
      "bg-transparent hover:bg-slate-900 text-slate-400 hover:text-white",
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
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {/* Loading state keeps the button width/content stable while a request runs. */}
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
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
  className: PropTypes.string,
  type: PropTypes.string,
};
