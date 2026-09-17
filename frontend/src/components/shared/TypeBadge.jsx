import { Sparkles, BookOpen, FileText, Layers, MessageSquare, Zap } from "lucide-react";
import PropTypes from "prop-types";

const TOOL_META = {
  explain: {
    label: "Explain",
    icon: BookOpen,
    badge: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  },
  summarize: {
    label: "Summarize",
    icon: FileText,
    badge: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  },
  quiz: {
    label: "Quiz",
    icon: Zap,
    badge: "text-violet-400 bg-violet-400/10 border-violet-400/30",
  },
  flashcards: {
    label: "Flashcards",
    icon: Layers,
    badge: "text-sky-400 bg-sky-400/10 border-sky-400/30",
  },
  chat: {
    label: "Chat",
    icon: MessageSquare,
    badge: "text-rose-400 bg-rose-400/10 border-rose-400/30",
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
