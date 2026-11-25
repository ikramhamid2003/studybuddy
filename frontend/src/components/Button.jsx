import { Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { getPrimaryGradient } from "../utils/routeColors";

// Every primary fill is a bright -400 → -500 ramp carrying near-black ink.
// White text on these accents measured 2.1–4.2:1, under the 4.5:1 floor for
// button text; near-black ink on the same fills measures 4.5–11.4:1. The tinted
// variants use the -300 text step for the same reason.
const BUTTON_COLORS = {
  amber: {
    primary: "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-500/40 hover:shadow-lg hover:shadow-amber-400/55",
    secondary: "bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-400/40 hover:border-amber-300/60",
    ghost: "text-amber-300 hover:text-amber-200 hover:bg-amber-500/15",
    focus: "focus-visible:ring-amber-400/70",
  },
  emerald: {
    primary: "bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-slate-950 shadow-md shadow-emerald-500/40 hover:shadow-lg hover:shadow-emerald-400/55",
    secondary: "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 hover:border-emerald-300/60",
    ghost: "text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/15",
    focus: "focus-visible:ring-emerald-400/70",
  },
  violet: {
    primary: "bg-gradient-to-r from-violet-400 to-violet-500 hover:from-violet-300 hover:to-violet-400 text-slate-950 shadow-md shadow-violet-500/40 hover:shadow-lg hover:shadow-violet-400/55",
    secondary: "bg-violet-500/15 hover:bg-violet-500/25 text-violet-200 border border-violet-400/40 hover:border-violet-300/60",
    ghost: "text-violet-300 hover:text-violet-200 hover:bg-violet-500/15",
    focus: "focus-visible:ring-violet-400/70",
  },
  sky: {
    primary: "bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-300 hover:to-sky-400 text-slate-950 shadow-md shadow-sky-500/40 hover:shadow-lg hover:shadow-sky-400/55",
    secondary: "bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-400/40 hover:border-sky-300/60",
    ghost: "text-sky-300 hover:text-sky-200 hover:bg-sky-500/15",
    focus: "focus-visible:ring-sky-400/70",
  },
  rose: {
    primary: "bg-gradient-to-r from-rose-400 to-rose-500 hover:from-rose-300 hover:to-rose-400 text-slate-950 shadow-md shadow-rose-500/40 hover:shadow-lg hover:shadow-rose-400/55",
    secondary: "bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-400/40 hover:border-rose-300/60",
    ghost: "text-rose-300 hover:text-rose-200 hover:bg-rose-500/15",
    focus: "focus-visible:ring-rose-400/70",
  },
  fuchsia: {
    primary: "bg-gradient-to-r from-fuchsia-400 to-fuchsia-500 hover:from-fuchsia-300 hover:to-fuchsia-400 text-slate-950 shadow-md shadow-fuchsia-500/40 hover:shadow-lg hover:shadow-fuchsia-400/55",
    secondary: "bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-400/40 hover:border-fuchsia-300/60",
    ghost: "text-fuchsia-300 hover:text-fuchsia-200 hover:bg-fuchsia-500/15",
    focus: "focus-visible:ring-fuchsia-400/70",
  },
};

// The app's pages sit on a light surface, so the quiet variants (secondary,
// ghost, danger, success) default to dark ink on a pale tint. The tints above
// use light text and are kept for the few dark panels, via surface="dark".
const LIGHT_TINTS = {
  amber: {
    secondary: "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300",
    ghost: "text-amber-800 hover:bg-amber-100",
    focus: "focus-visible:ring-amber-600",
  },
  emerald: {
    secondary: "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300",
    ghost: "text-emerald-800 hover:bg-emerald-100",
    focus: "focus-visible:ring-emerald-600",
  },
  violet: {
    secondary: "bg-violet-50 hover:bg-violet-100 text-violet-900 border border-violet-300",
    ghost: "text-violet-800 hover:bg-violet-100",
    focus: "focus-visible:ring-violet-600",
  },
  sky: {
    secondary: "bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300",
    ghost: "text-sky-800 hover:bg-sky-100",
    focus: "focus-visible:ring-sky-600",
  },
  rose: {
    secondary: "bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300",
    ghost: "text-rose-800 hover:bg-rose-100",
    focus: "focus-visible:ring-rose-600",
  },
  fuchsia: {
    secondary: "bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-900 border border-fuchsia-300",
    ghost: "text-fuchsia-800 hover:bg-fuchsia-100",
    focus: "focus-visible:ring-fuchsia-600",
  },
};
const LIGHT_DEFAULT = {
  secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300",
  ghost: "text-slate-700 hover:text-slate-900 hover:bg-slate-100",
  danger: "bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300",
  success: "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300",
  focus: "focus-visible:ring-slate-600",
};

// Semantic variants carry their own ring so focus matches what the button does.
const SEMANTIC_FOCUS = {
  danger: "focus-visible:ring-rose-400/70",
  success: "focus-visible:ring-emerald-400/70",
};

export default function Button({
  children,
  onClick,
  disabled,
  loading,
  variant = "primary",
  size = "md",
  surface = "light",
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
  const light = surface === "light" && variant !== "primary";
  const lightTheme = color ? LIGHT_TINTS[color] : null;
  const focusColor = light
    ? lightTheme?.focus ||
      { danger: "focus-visible:ring-rose-600", success: "focus-visible:ring-emerald-600" }[variant] ||
      LIGHT_DEFAULT.focus
    : colorTheme?.focus ||
      SEMANTIC_FOCUS[variant] ||
      "focus-visible:ring-amber-400/70";

  // Variant and size maps keep call sites small and consistent.
  const variants = {
    // Primary owns the strongest treatment: bright fill, a hue glow, and a
    // lift on hover. Quieter variants change surface, text and border only.
    primary: `border-none relative overflow-hidden ${selectedPrimary}`,
    secondary: light
      ? lightTheme?.secondary || LIGHT_DEFAULT.secondary
      : colorTheme?.secondary ||
      "bg-slate-700/60 hover:bg-slate-700 text-slate-100 border border-slate-600 hover:border-slate-400",
    ghost: light
      ? lightTheme?.ghost || LIGHT_DEFAULT.ghost
      : colorTheme?.ghost || "text-slate-400 hover:text-white hover:bg-slate-700/70",
    danger: light
      ? LIGHT_DEFAULT.danger
      : "bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-400/40 hover:border-rose-300/60",
    success: light
      ? LIGHT_DEFAULT.success
      : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 hover:border-emerald-300/60",
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
      // `aria-busy` marks the button as working while its label stays put.
      aria-busy={loading || undefined}
      className={`
        group inline-flex items-center justify-center gap-2 font-body
        transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out
        disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none
        disabled:shadow-none disabled:transform-none
        focus-visible:outline-none focus-visible:ring-2 ${focusColor}
        focus-visible:ring-offset-2 ${light ? "focus-visible:ring-offset-white" : "focus-visible:ring-offset-slate-950"}
        ${variant === "primary" ? "motion-safe:hover:-translate-y-0.5" : ""}
        motion-safe:active:scale-[0.97]
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {/* The label is never replaced while loading: it is what tells the user
          (and assistive tech) which action is in flight, and keeping it stops
          the button from changing width mid-request. */}
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
      {children}
      {/* Shimmer overlay for primary variant */}
      {variant === "primary" && !loading && !disabled && (
        <span
          className="absolute inset-0 pointer-events-none btn-shimmer"
          aria-hidden="true"
        />
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
  surface: PropTypes.oneOf(["light", "dark"]),
  color: PropTypes.oneOf(["amber", "emerald", "violet", "sky", "rose", "fuchsia"]),
  className: PropTypes.string,
  type: PropTypes.string,
};
