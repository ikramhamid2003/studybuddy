import { Sparkles, BookOpen, FileText, Layers, MessageSquare, Zap } from "lucide-react";
import PropTypes from "prop-types";

const TOOL_META = {
  explain: {
    label: "Explain",
    icon: BookOpen,
    badge: "text-amber-700 bg-amber-50 border-amber-200",
  },
  summarize: {
    label: "Summarize",
    icon: FileText,
    badge: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  quiz: {
    label: "Quiz",
    icon: Zap,
    badge: "text-violet-700 bg-violet-50 border-violet-200",
  },
  flashcards: {
    label: "Flashcards",
    icon: Layers,
    badge: "text-sky-700 bg-sky-50 border-sky-200",
  },
  chat: {
    label: "Chat",
    icon: MessageSquare,
    badge: "text-rose-700 bg-rose-50 border-rose-200",
  },
};

export default function TypeBadge({ type }) {
  const meta = TOOL_META[type];
  const Icon = meta ? meta.icon : Sparkles;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-full border flex-shrink-0 ${
        meta ? meta.badge : "text-slate-400 bg-slate-800 border-slate-700"
      }`}
    >
      <Icon size={12} />
      {meta ? meta.label : type}
    </span>
  );
}

TypeBadge.propTypes = {
  type: PropTypes.string.isRequired,
};
