import { History, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import LoadingSkeleton from "./LoadingSkeleton";
import { listGenerations } from "../utils/api";

const TITLES = {
  explain: "Explanation History",
  summarize: "Summary History",
  quiz: "Quiz History",
  flashcards: "Flashcard History",
  chat: "Chat History",
};

export default function ToolHistory({ type, activeId, onSelect }) {
  // Each tool page receives only its own saved generations by passing a type
  // filter to the shared history endpoint.
  const { data: history, isLoading } = useQuery({
    queryKey: ["generations", type],
    queryFn: () => listGenerations(type),
  });

  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <History className="text-slate-500" size={16} />
        <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">
          {TITLES[type] || "History"}
        </span>
      </div>

      {isLoading ? (
        <LoadingSkeleton lines={2} message="Loading history..." />
      ) : !history || history.length === 0 ? (
        <p className="text-slate-600 text-sm font-mono">
          No saved {TITLES[type]?.toLowerCase() || "history"} yet.
        </p>
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <button
              key={item.id}
              // Parent pages know how to hydrate their own result UI from the
              // stored generation payload.
              onClick={() => onSelect(item)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                activeId === item.id
                  ? "border-amber-400/40 bg-slate-800"
                  : "border-slate-800 bg-slate-900/60 hover:bg-slate-800/60"
              }`}
            >
              <span className="text-slate-300 text-sm truncate flex-1">
                {item.topic}
              </span>
              <span className="text-slate-600 text-xs font-mono flex-shrink-0">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
              <RotateCcw size={14} className="text-slate-600 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
