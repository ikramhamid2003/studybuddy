export const TOOL_OPTIONS = [
  { value: "explain", label: "Explain" },
  { value: "summarize", label: "Summarize" },
  { value: "quiz", label: "Quiz" },
  { value: "flashcards", label: "Flashcards" },
  { value: "chat", label: "Chat" },
];

// History filter tabs take the hue of the tool they filter, so the selected
// filter is readable at a glance instead of a grey pill among grey pills.
export const TAB_COLORS = {
  all: {
    active: "bg-fuchsia-50 border-fuchsia-300 text-fuchsia-700",
    idle: "border-transparent text-slate-600 hover:text-fuchsia-700 hover:bg-fuchsia-50",
  },
  explain: {
    active: "bg-amber-50 border-amber-300 text-amber-700",
    idle: "border-transparent text-slate-600 hover:text-amber-700 hover:bg-amber-50",
  },
  summarize: {
    active: "bg-emerald-50 border-emerald-300 text-emerald-700",
    idle: "border-transparent text-slate-600 hover:text-emerald-700 hover:bg-emerald-50",
  },
  quiz: {
    active: "bg-violet-50 border-violet-300 text-violet-700",
    idle: "border-transparent text-slate-600 hover:text-violet-700 hover:bg-violet-50",
  },
  flashcards: {
    active: "bg-sky-50 border-sky-300 text-sky-700",
    idle: "border-transparent text-slate-600 hover:text-sky-700 hover:bg-sky-50",
  },
  chat: {
    active: "bg-rose-50 border-rose-300 text-rose-700",
    idle: "border-transparent text-slate-600 hover:text-rose-700 hover:bg-rose-50",
  },
};
