/**
 * Centralized route → color mappings. Every component that needs to know
 * "what color does this route use?" imports from here instead of redefining
 * its own map. Add a new tool in one place and it propagates everywhere.
 */

export const ROUTE_PRIMARY = {
  "/all": {
    gradient: "bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 text-white shadow-[0_4px_20px_rgba(217,70,239,0.35)] hover:shadow-[0_4px_28px_rgba(217,70,239,0.5)]",
  },
  "/explain": {
    gradient: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:shadow-[0_4px_28px_rgba(245,158,11,0.5)]",
  },
  "/summarize": {
    gradient: "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-[0_4px_20px_rgba(16,185,129,0.35)] hover:shadow-[0_4px_28px_rgba(16,185,129,0.5)]",
  },
  "/quiz": {
    gradient: "bg-gradient-to-r from-violet-700 to-violet-600 hover:from-violet-600 hover:to-violet-500 text-white shadow-[0_4px_20px_rgba(139,92,246,0.35)] hover:shadow-[0_4px_28px_rgba(139,92,246,0.5)]",
  },
  "/flashcards": {
    gradient: "bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white shadow-[0_4px_20px_rgba(14,165,233,0.35)] hover:shadow-[0_4px_28px_rgba(14,165,233,0.5)]",
  },
  "/chat": {
    gradient: "bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-[0_4px_20px_rgba(244,63,94,0.35)] hover:shadow-[0_4px_28px_rgba(244,63,94,0.5)]",
  },
  "/login": {
    gradient: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:shadow-[0_4px_28px_rgba(245,158,11,0.5)]",
  },
  "/register": {
    gradient: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:shadow-[0_4px_28px_rgba(245,158,11,0.5)]",
  },
};

const DEFAULT_GRADIENT = "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:shadow-[0_4px_28px_rgba(245,158,11,0.5)]";

export function getPrimaryGradient(path) {
  return (ROUTE_PRIMARY[path] || ROUTE_PRIMARY["/explain"]).gradient || DEFAULT_GRADIENT;
}

export const ROUTE_GLOW = {
  "/all": "bg-fuchsia-500/10 shadow-[0_0_160px_rgba(217,70,239,0.12)]",
  "/explain": "bg-amber-500/10 shadow-[0_0_160px_rgba(245,158,11,0.12)]",
  "/summarize": "bg-emerald-500/10 shadow-[0_0_160px_rgba(16,185,129,0.12)]",
  "/quiz": "bg-violet-500/10 shadow-[0_0_160px_rgba(139,92,246,0.12)]",
  "/flashcards": "bg-sky-500/10 shadow-[0_0_160px_rgba(14,165,233,0.12)]",
  "/chat": "bg-rose-500/10 shadow-[0_0_160px_rgba(244,63,94,0.12)]",
};

export const ROUTE_ACCENT_LINE = {
  "/all": "from-fuchsia-500/50 via-fuchsia-500/10 to-transparent",
  "/explain": "from-amber-500/50 via-amber-500/10 to-transparent",
  "/summarize": "from-emerald-500/50 via-emerald-500/10 to-transparent",
  "/quiz": "from-violet-500/50 via-violet-500/10 to-transparent",
  "/flashcards": "from-sky-500/50 via-sky-500/10 to-transparent",
  "/chat": "from-rose-500/50 via-rose-500/10 to-transparent",
};

export const ROUTE_ACCENT_BG = {
  "/all": "from-fuchsia-500/10 via-fuchsia-500/5 to-transparent",
  "/explain": "from-amber-500/10 via-amber-500/5 to-transparent",
  "/summarize": "from-emerald-500/10 via-emerald-500/5 to-transparent",
  "/quiz": "from-violet-500/10 via-violet-500/5 to-transparent",
  "/flashcards": "from-sky-500/10 via-sky-500/5 to-transparent",
  "/chat": "from-rose-500/10 via-rose-500/5 to-transparent",
};
