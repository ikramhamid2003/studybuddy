import { Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function Button({
  children,
  onClick,
  disabled,
  loading,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
}) {
  const location = useLocation();
  const path = location.pathname;

  const primaryThemes = {
    "/explain": "bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-250 text-slate-950 shadow-[0_4px_20px_rgba(245,158,11,0.18)] hover:shadow-[0_4px_28px_rgba(245,158,11,0.3)]",
    "/summarize": "bg-gradient-to-r from-emerald-500 to-emerald-450 hover:from-emerald-450 hover:to-emerald-350 text-slate-950 shadow-[0_4px_20px_rgba(16,185,129,0.18)] hover:shadow-[0_4px_28px_rgba(16,185,129,0.3)] text-white",
    "/quiz": "bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-450 text-white shadow-[0_4px_20px_rgba(139,92,246,0.18)] hover:shadow-[0_4px_28px_rgba(139,92,246,0.3)]",
    "/flashcards": "bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 hover:to-sky-300 text-slate-950 shadow-[0_4px_20px_rgba(14,165,233,0.18)] hover:shadow-[0_4px_28px_rgba(14,165,233,0.3)]",
    "/chat": "bg-gradient-to-r from-rose-500 to-rose-450 hover:from-rose-450 hover:to-rose-350 text-white shadow-[0_4px_20px_rgba(244,63,94,0.18)] hover:shadow-[0_4px_28px_rgba(244,63,94,0.3)]",
  };

  const selectedPrimary = primaryThemes[path] || "bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-250 text-slate-950 shadow-[0_4px_20px_rgba(245,158,11,0.18)]";

  const variants = {
    primary: `${selectedPrimary} font-bold border-none transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.99]`,
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
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
