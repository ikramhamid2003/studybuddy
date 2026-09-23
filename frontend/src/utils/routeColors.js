/**
 * Centralized route → color mappings. Every component that needs to know
 * "what color does this route use?" imports from here instead of redefining
 * its own map. Add a new tool in one place and it propagates everywhere.
 */

// Primary action fills. Each tool owns a bright -400 → -500 ramp carrying
// near-black ink. White text on these accents measured 2.1–4.2:1, under the
// 4.5:1 floor for button text; near-black ink on the same fills measures
// 4.5–11.4:1. The glow stays light so the fill, not a halo, carries the weight.
export const ROUTE_PRIMARY = {
  "/all": {
    gradient: "bg-gradient-to-r from-fuchsia-400 to-fuchsia-500 hover:from-fuchsia-300 hover:to-fuchsia-400 text-slate-950 shadow-md shadow-fuchsia-500/25 hover:shadow-lg hover:shadow-fuchsia-500/35",
  },
  "/explain": {
    gradient: "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-500/25 hover:shadow-lg hover:shadow-amber-500/35",
  },
  "/summarize": {
    gradient: "bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-slate-950 shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/35",
  },
  "/quiz": {
    gradient: "bg-gradient-to-r from-violet-400 to-violet-500 hover:from-violet-300 hover:to-violet-400 text-slate-950 shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/35",
  },
  "/flashcards": {
    gradient: "bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-300 hover:to-sky-400 text-slate-950 shadow-md shadow-sky-500/25 hover:shadow-lg hover:shadow-sky-500/35",
  },
  "/chat": {
    gradient: "bg-gradient-to-r from-rose-400 to-rose-500 hover:from-rose-300 hover:to-rose-400 text-slate-950 shadow-md shadow-rose-500/25 hover:shadow-lg hover:shadow-rose-500/35",
  },
  "/login": {
    gradient: "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-500/25 hover:shadow-lg hover:shadow-amber-500/35",
  },
  "/register": {
    gradient: "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-500/25 hover:shadow-lg hover:shadow-amber-500/35",
  },
};

const DEFAULT_GRADIENT = "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-500/25 hover:shadow-lg hover:shadow-amber-500/35";

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
