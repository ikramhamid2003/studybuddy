import { History, RotateCcw, BookOpen, FileText, Zap, Layers, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import LoadingSkeleton from "./LoadingSkeleton";
import { listGenerations } from "../utils/api";
import PropTypes from "prop-types";

const TITLES = {
  explain: "Explanation History",
  summarize: "Summary History",
  quiz: "Quiz History",
  flashcards: "Flashcard History",
  chat: "Chat History",
};

const ICONS = {
  explain: BookOpen,
  summarize: FileText,
  quiz: Zap,
  flashcards: Layers,
  chat: MessageSquare,
};

export default function ToolHistory({ type, activeId, onSelect }) {
  // Each tool page receives only its own saved generations by passing a type
  // filter to the shared history endpoint.
  const { data: history, isLoading, error, refetch } = useQuery({
    queryKey: ["generations", type],
    queryFn: () => listGenerations(type),
  });

  const Icon = ICONS[type] || BookOpen;

  if (isLoading) {
    return (
      <div className="mt-10 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <History className="text-slate-500" size={16} />
          <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">
            {TITLES[type] || "History"}
          </span>
        </div>
        <LoadingSkeleton lines={3} message="Loading history..." variant="card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-10 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <History className="text-slate-500" size={16} />
          <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">
            {TITLES[type] || "History"}
          </span>
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-rose-400 text-xl" role="img" aria-label="error">⚠️</span>
          </div>
          <p className="text-rose-400 text-sm mb-2">Couldn't load history</p>
          <button
            onClick={() => refetch()}
            className="text-amber-400 hover:text-amber-300 text-xs font-mono underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="mt-10 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <History className="text-slate-500" size={16} />
          <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">
            {TITLES[type] || "History"}
          </span>
        </div>
        <div className="text-center py-12 bg-slate-900/40 border border-slate-800/60 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4 border border-slate-800">
            <Icon className="text-slate-500" size={28} />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">
            No saved {TITLES[type]?.toLowerCase() || "history"} yet
          </p>
          <p className="text-slate-600 text-xs font-light max-w-xs mx-auto">
            Generate something above and it will appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <History className="text-slate-500" size={16} />
        <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">
          {TITLES[type] || "History"}
        </span>
        <span className="ml-auto text-slate-600 text-xs font-mono">
          {history.length} saved
        </span>
      </div>

      <div className="space-y-2">
        {history.map((item, index) => (
          <button
            key={item.id}
            // Parent pages know how to hydrate their own result UI from the
            // stored generation payload.
            onClick={() => onSelect(item)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 group ${
              activeId === item.id
                ? "border-amber-400/40 bg-slate-800 shadow-[0_0_20px_rgba(245,158,11,0.05)]"
                : "border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 hover:border-slate-700"
            }`}
            style={{ animationDelay: `${index * 30}ms` }}
            aria-current={activeId === item.id ? "true" : undefined}
          >
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                activeId === item.id ? "bg-amber-500/20 text-amber-400" : "bg-slate-800/60 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-400"
              } transition-colors`}>
                <Icon size={14} />
              </div>
            </div>
            <span className="text-slate-300 text-sm truncate flex-1">
              {item.topic}
            </span>
            <span className="text-slate-600 text-xs font-mono flex-shrink-0 hidden sm:inline">
              {new Date(item.created_at).toLocaleDateString()}
            </span>
            <RotateCcw size={14} className="text-slate-600 flex-shrink-0 group-hover:text-amber-400 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}

ToolHistory.propTypes = {
  type: PropTypes.oneOf(["explain", "summarize", "quiz", "flashcards", "chat"]).isRequired,
  activeId: PropTypes.number,
  onSelect: PropTypes.func.isRequired,
};
