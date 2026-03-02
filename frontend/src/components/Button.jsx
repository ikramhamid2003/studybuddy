import { Loader2 } from "lucide-react";

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
  const variants = {
    primary:
      "bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold shadow-glow-sm hover:shadow-glow",
    secondary:
      "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700",
    ghost:
      "bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white",
    danger:
      "bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30",
    success:
      "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-5 py-2.5 text-sm rounded-xl",
    lg: "px-7 py-3 text-base rounded-xl",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center gap-2 transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
