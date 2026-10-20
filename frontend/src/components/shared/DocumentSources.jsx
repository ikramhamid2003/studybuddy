import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";

function SourceCard({ source, index }) {
  const [expanded, setExpanded] = useState(false);
  const score = Number(source.score ?? 0);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 truncate">{source.document_title}</p>
          <p className="text-xs text-slate-400">
            Page {source.page_number ?? "?"} · relevance {(score * 100).toFixed(0)}%
          </p>
        </div>
        {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {expanded && (
        <div className="px-3.5 py-2.5 bg-white border-t border-slate-100">
          <p className="text-xs text-slate-600 leading-relaxed font-mono">{source.text_preview}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Provenance for any grounded payload — every document-grounded generation
 * shares this, including when a saved generation is reopened from history.
 */
export default function DocumentSources({ sources = [], className = "" }) {
  if (!sources.length) return null;
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
        <BookOpen size={11} />
        Sources ({sources.length})
      </p>
      <div className="flex flex-col gap-2">
        {sources.map((src, i) => (
          <SourceCard key={i} source={src} index={i} />
        ))}
      </div>
    </div>
  );
}
