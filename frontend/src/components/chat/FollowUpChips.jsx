import { useState, useRef, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { fetchChatSuggestions } from "../../utils/api";

// Suggestion chips offered after an assistant reply. The parent keys this by
// turn (session + message count), so each new assistant turn remounts it with
// fresh local state and a fresh fetch.
export default function FollowUpChips({ sessionId, onPick }) {
  const [suggestions, setSuggestions] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    const requestId = `req:${sessionId}`;
    requestRef.current = requestId;
    setLoading(true);
    setSuggestions([]);
    fetchChatSuggestions(sessionId)
      .then((data) => {
        // Ignore the result if this component was unmounted or a newer request
        // superseded it (e.g. the user switched sessions mid-flight).
        if (cancelled || requestRef.current !== requestId) return;
        setSuggestions(data?.suggestions || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled && requestRef.current === requestId) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (dismissed || loading || suggestions.length === 0) return null;

  return (
    <div className="flex gap-3">
      {/* Match the assistant bubble's avatar gutter so chips align with text. */}
      <div className="w-8 flex-shrink-0" />
      <div className="flex flex-col gap-1.5 max-w-[78%]">
        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono">
          <Sparkles size={11} />
          <span>Ask next</span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="ml-0.5 text-slate-400 hover:text-slate-400 transition-colors"
            aria-label="Dismiss suggestions"
          >
            <X size={11} />
          </button>
        </div>
        <div role="group" aria-label="Suggested follow-up questions" className="flex flex-wrap gap-1.5">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPick(s)}
              className="px-2.5 py-1.5 bg-slate-800/60 hover:bg-amber-500/15 border border-slate-700 hover:border-amber-400/50 rounded-lg text-xs text-slate-400 hover:text-amber-300 transition-colors text-left"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
