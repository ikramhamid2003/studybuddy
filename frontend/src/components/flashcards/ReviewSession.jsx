import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import Card from "../Card";
import Button from "../Button";
import LoadingSkeleton from "../LoadingSkeleton";
import { fetchDueCards, submitCardReview } from "../../utils/api";

// Dark ink on light tints: this page sits on a light surface, where the shared
// Button's tinted variants (light text) fall well under 4.5:1.
const RATINGS = [
  { key: "again", label: "Again", hint: "1", tone: "bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-300" },
  { key: "hard", label: "Hard", hint: "2", tone: "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300" },
  { key: "good", label: "Good", hint: "3", tone: "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300" },
  { key: "easy", label: "Easy", hint: "4", tone: "bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-300" },
];

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-1";

/**
 * One spaced-repetition sitting: shows each due card, asks how well it was
 * recalled, and sends the rating so the server can schedule the next review.
 * Cards rated "Again" return at the end of the same session.
 */
export default function ReviewSession({ generationId, onExit }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["flashcard-review", "session", generationId ?? "all"],
    queryFn: () => fetchDueCards({ generationId }),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });

  const [queue, setQueue] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tally, setTally] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [announcement, setAnnouncement] = useState("");
  const showRef = useRef(null);
  const ratingsRef = useRef(null);
  const total = useRef(0);

  useEffect(() => {
    if (data && queue === null) {
      setQueue(data.cards);
      total.current = data.cards.length;
    }
  }, [data, queue]);

  const current = queue?.[0];

  // Keep keyboard focus on the control that is useful next.
  useEffect(() => {
    if (!current) return;
    // Focus the labelled group, not a rating: a stray Enter/Space must not grade the card.
    if (revealed) ratingsRef.current?.focus();
    else showRef.current?.querySelector("button")?.focus();
  }, [current, revealed]);

  async function rate(rating) {
    if (!current || saving) return;
    setSaving(true);
    try {
      await submitCardReview(current.generation_id, current.card_index, rating);
    } catch (err) {
      toast.error(err.message || "Could not save that review.");
      setSaving(false);
      return;
    }
    setTally((t) => ({ ...t, [rating]: t[rating] + 1 }));
    setQueue((q) => (rating === "again" ? [...q.slice(1), q[0]] : q.slice(1)));
    setRevealed(false);
    setAnnouncement("");
    setSaving(false);
  }

  function reveal() {
    setRevealed(true);
    setAnnouncement(`Answer: ${current.back}`);
  }

  // 1-4 rate the card once its answer is showing.
  useEffect(() => {
    if (!revealed) return undefined;
    function onKeyDown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const choice = RATINGS.find((r) => r.hint === e.key);
      if (choice) {
        e.preventDefault();
        rate(choice.key);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  if (isLoading || (data && queue === null)) {
    return (
      <Card variant="elevated">
        <LoadingSkeleton lines={2} message="Finding your due cards..." variant="card" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="outlined" className="text-center py-10">
        <p className="text-slate-700 text-sm mb-4" role="alert">
          {error.message || "Could not load your review cards."}
        </p>
        <Button size="sm" color="sky" onClick={onExit}>Back to flashcards</Button>
      </Card>
    );
  }

  const reviewed = tally.again + tally.hard + tally.good + tally.easy;

  if (!current) {
    return (
      <Card variant="elevated" className="text-center py-10">
        <CheckCircle2 className="mx-auto mb-3 text-emerald-600" size={36} aria-hidden="true" />
        <h2 className="text-lg font-display text-slate-900 mb-1">
          {reviewed ? "Session complete" : "Nothing due right now"}
        </h2>
        <p className="text-slate-600 text-sm mb-5" role="status">
          {reviewed
            ? `You reviewed ${reviewed} card${reviewed === 1 ? "" : "s"}: ${tally.easy} easy, ${tally.good} good, ${tally.hard} hard, ${tally.again} to relearn.`
            : "Generate a new deck, or come back when cards are due."}
        </p>
        <Button onClick={onExit} color="sky">Back to flashcards</Button>
      </Card>
    );
  }

  const position = Math.min(reviewed + 1, Math.max(total.current, reviewed + 1));

  return (
    <section aria-label="Flashcard review" className="animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-600 text-xs font-mono">
          {queue.length} left{current.is_new ? " · new card" : " · due"}
        </span>
        <button
          type="button"
          onClick={onExit}
          className={`rounded-xl px-3.5 py-2 text-xs font-medium text-sky-800 hover:bg-sky-100 ${FOCUS_RING}`}
        >
          End session
        </button>
      </div>

      <Card variant="elevated" className="text-center py-8 px-6">
        <p className="text-slate-600 text-xs mb-1 truncate">{current.topic}</p>
        <p className="sr-only">Card {position}</p>
        <p className="text-xl text-slate-900 font-display mb-2 break-words">{current.front}</p>
        {current.hint && !revealed && (
          <p className="text-slate-600 text-xs">Hint: {current.hint}</p>
        )}

        {revealed && (
          <p className="mt-4 pt-4 border-t border-slate-200 text-lg text-emerald-800 break-words">
            {current.back}
          </p>
        )}

        {!revealed ? (
          <div className="mt-6" ref={showRef}>
            <Button onClick={reveal} color="sky">Show answer</Button>
          </div>
        ) : (
          <div
            ref={ratingsRef}
            role="group"
            tabIndex={-1}
            aria-label="How well did you remember it?"
            className="outline-none mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2"
          >
            {RATINGS.map((r) => (
              <button
                key={r.key}
                type="button"
                disabled={saving}
                onClick={() => rate(r.key)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${r.tone} ${FOCUS_RING}`}
              >
                {r.label}
                <span className="text-[11px] opacity-80" aria-hidden="true">{r.hint}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <span role="status" aria-live="polite" className="sr-only">{announcement}</span>
    </section>
  );
}

ReviewSession.propTypes = {
  generationId: PropTypes.number,
  onExit: PropTypes.func.isRequired,
};
