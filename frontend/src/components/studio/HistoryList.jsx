import { History, RotateCcw, Trash2 } from "lucide-react";
import Card from "../Card";
import LoadingSkeleton from "../LoadingSkeleton";
import TypeBadge from "../shared/TypeBadge";
import { TAB_COLORS, TOOL_OPTIONS } from "./studioConstants";

export default function HistoryList({ history, loading, selectedTab, onTabChange, active, onOpen, onDelete }) {
  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <History className="text-slate-500" size={16} />
        <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">
          Saved Generations
        </span>
      </div>
      {loading ? (
        <Card variant="elevated">
          <LoadingSkeleton lines={3} message="Loading history..." variant="card" />
        </Card>
      ) : !history || history.length === 0 ? (
        <Card variant="outlined" className="text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4 border border-slate-800">
            <History className="text-slate-500" size={28} />
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">No saved generations yet</p>
          <p className="text-slate-600 text-xs max-w-xs mx-auto">
            Generate something above and it will show up here automatically.
          </p>
        </Card>
      ) : (
        <>
          {/* Tab navbar */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-4 border border-slate-200 overflow-x-auto">
            {[
              { key: "all", label: "All" },
              ...TOOL_OPTIONS.map((o) => ({ key: o.value, label: o.label })),
            ].map((tab) => {
              const count = tab.key === "all"
                ? history.length
                : history.filter((h) => h.type === tab.key).length;
              return (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap ${
                    selectedTab === tab.key
                      ? TAB_COLORS[tab.key].active
                      : TAB_COLORS[tab.key].idle
                  }`}
                >
                  {tab.label}
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      selectedTab === tab.key
                        ? "bg-white text-slate-700"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filtered history list */}
          <div className="space-y-2">
            {history
              .filter((item) => selectedTab === "all" || item.type === selectedTab)
              .map((item, index) => (
                <Card
                  key={item.id}
                  variant={active?.result === item.result ? "elevated" : "default"}
                  className={`transition-all duration-200 ${
                    active?.result === item.result ? "border-indigo-300 bg-indigo-50 shadow-sm" : ""
                  }`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-center gap-2">
                    {/* The row is a real button and the delete control is its
                        sibling: a button nested inside a role="button" card
                        is an interactive-inside-interactive failure. */}
                    <button
                      onClick={() => onOpen(item)}
                      className="flex-1 min-w-0 flex items-center gap-3 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/70"
                    >
                      <TypeBadge type={item.type} />
                      <span className="text-slate-800 text-sm truncate flex-1">{item.topic}</span>
                      <span className="text-slate-500 text-xs font-mono flex-shrink-0 hidden sm:inline">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <RotateCcw size={14} className="text-slate-500 flex-shrink-0" />
                    </button>
                    <button
                      onClick={() => onDelete(item)}
                      className="icon-button icon-button--danger -mr-1 flex-shrink-0"
                      title="Delete from history"
                      aria-label={`Delete saved ${item.type} generation "${item.topic}"`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
