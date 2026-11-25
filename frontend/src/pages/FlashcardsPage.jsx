import { useState } from "react";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, RotateCcw, Download, ArrowRight, Brain } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input, Select } from "../components/Input";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ToolHistory from "../components/ToolHistory";
import Flashcard from "../components/shared/Flashcard";
import ReviewSession from "../components/flashcards/ReviewSession";
import DocumentPicker from "../components/shared/DocumentPicker";
import DocumentSources from "../components/shared/DocumentSources";
import GroundingNote from "../components/shared/GroundingNote";
import { docIdsOption } from "../components/shared/documentLibrary";
import { useGenerationAbort } from "../components/shared/generationAbort";
import { useLibrary } from "../context/DocumentLibraryContext";
import { fetchDueCards, generateAll } from "../utils/api";
import { usePendingTopic } from "../utils/pendingTopic";

export default function FlashcardsPage() {
  const queryClient = useQueryClient();
  const library = useLibrary();
  const abort = useGenerationAbort();
  // `key` forces React to remount cards when resetting every flipped card.
  // Picks up a topic typed into the home focus box, if one was stashed.
  const [topic, setTopic] = useState("");
  usePendingTopic(setTopic);
  const [numCards, setNumCards] = useState("8");
  const [cards, setCards] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [key, setKey] = useState(0); // used to reset all cards
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  // null = browsing; otherwise a spaced-repetition session (optionally one deck).
  const [review, setReview] = useState(null);

  // How many cards are waiting, shown on the "Review" banner.
  const { data: queueSummary } = useQuery({
    queryKey: ["flashcard-review", "summary"],
    queryFn: () => fetchDueCards({ limit: 1 }),
  });
  const waiting = (queueSummary?.due_count ?? 0) + (queueSummary?.new_count ?? 0);

  function endReview() {
    setReview(null);
    queryClient.invalidateQueries({ queryKey: ["flashcard-review"] });
  }

  async function handleGenerate() {
    if (!topic.trim()) return toast.error("Please enter a topic");
    setLoading(true);
    // Clear old cards while the new deck is being generated.
    setCards([]);
    setSources([]);
    try {
      const data = await generateAll(
        topic.trim(),
        "flashcards",
        {
          num_cards: parseInt(numCards),
          ...docIdsOption(library.selectedIds),
        },
        abort.start()
      );
      if (!data.flashcards?.length) throw new Error("No flashcards returned");
      setCards(data.flashcards);
      setSources(data.sources || []);
      setActiveHistoryId(data.generation_id ?? null);
      setKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: ["generations", "flashcards"] });
      queryClient.invalidateQueries({ queryKey: ["usage_stats"] });
      queryClient.invalidateQueries({ queryKey: ["flashcard-review"] });
      toast.success(`${data.flashcards.length} flashcards created!`);
    } catch (err) {
      if (abort.isAbort(err)) return;
      toast.error(err.message || "Flashcard generation failed.");
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!cards.length) return;
    // Escape quotes so the generated CSV stays valid for flashcard importers.
    const header = "Front,Back,Hint\n";
    const rows = cards.map(c => `"${c.front.replace(/"/g, '""')}","${c.back.replace(/"/g, '""')}","${(c.hint || '').replace(/"/g, '""')}"`).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + header + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${topic || "flashcards"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleReset() {
    setKey((k) => k + 1);
    toast("All cards reset!", { icon: "🔄" });
  }

  if (review) {
    return (
      <div>
        <PageHeader icon="🃏" title="Review" subtitle="Rate how well you remember each card" />
        <ReviewSession generationId={review.generationId} onExit={endReview} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon="🃏"
        title="Flashcards"
        subtitle="Click any card to flip it and reveal the answer"
      />

      {waiting > 0 && (
        <Card className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Brain className="text-sky-700" size={20} aria-hidden="true" />
            <p className="text-slate-700 text-sm">
              <strong className="font-semibold text-slate-900">
                {queueSummary.due_count} due
              </strong>
              {" · "}
              {queueSummary.new_count} new. Spaced repetition shows each card just before you would forget it.
            </p>
          </div>
          <Button size="sm" color="sky" onClick={() => setReview({ generationId: undefined })}>
            Start review
          </Button>
        </Card>
      )}

      {/* Grounding: upload button + document dropdown, the shared document library */}
      <DocumentPicker library={library} title="Ground the deck in my documents" />

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            label="Topic"
            placeholder="e.g. Spanish vocabulary, Calculus, World capitals..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            className="flex-1"
            leftIcon={<Layers className="w-4 h-4" />}
          />
          <Select
            label="Number of Cards"
            value={numCards}
            onChange={(e) => setNumCards(e.target.value)}
            className="sm:w-44"
            color="sky"
          >
            <option value="5">5 cards</option>
            <option value="8">8 cards</option>
            <option value="10">10 cards</option>
            <option value="15">15 cards</option>
          </Select>
        </div>
        <div className="mt-4">
          <Button onClick={handleGenerate} loading={loading} disabled={!topic.trim()}>
            <ArrowRight size={16} />
            Generate Deck
          </Button>
        </div>
      </Card>

      <GroundingNote />

      {loading && (
        <Card variant="elevated">
          <LoadingSkeleton lines={3} message="Creating your flashcard deck..." variant="card" />
        </Card>
      )}

      {cards.length > 0 && !loading && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 animate-fade-up">
            <span className="text-slate-500 text-xs font-mono">
              {cards.length} cards · click or press Space to flip
            </span>
            <div className="flex gap-2">
              {activeHistoryId != null && (
                <button
                  type="button"
                  onClick={() => setReview({ generationId: activeHistoryId })}
                  className="inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2 text-xs font-medium text-sky-900 transition-colors hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
                >
                  <Brain size={13} aria-hidden="true" />
                  Review this deck
                </button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={exportCSV}
                color="sky"
              >
                <Download size={13} />
                Export CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                color="sky"
              >
                <RotateCcw size={13} />
                Reset All
              </Button>
            </div>
          </div>

          <div key={key} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card, i) => (
              <div key={card.id} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                <Flashcard card={card} index={i} />
              </div>
            ))}
          </div>

          <DocumentSources sources={sources} className="mt-6" />
        </>
      )}

      {cards.length === 0 && !loading && (
        <Card variant="outlined" className="text-center py-12 animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4 border border-slate-800">
            <Layers className="text-slate-500" size={32} />
          </div>
          <p className="text-slate-500 text-sm font-medium mb-1">No flashcards yet</p>
          <p className="text-slate-600 text-xs max-w-xs mx-auto">
            Enter a topic above to generate your first flashcard deck
          </p>
        </Card>
      )}

      <ToolHistory
        type="flashcards"
        activeId={activeHistoryId}
        onSelect={(item) => {
          // Reopened decks reuse the stored payload and remount cards unflipped.
          setTopic(item.topic);
          setCards(item.result.flashcards || []);
          setSources(item.result.sources || []);
          setActiveHistoryId(item.id);
          setKey((k) => k + 1);
        }}
        onDeleted={(id) => {
          // Clear the open deck when the entry backing it is removed.
          if (activeHistoryId === id) {
            setCards([]);
            setSources([]);
            setActiveHistoryId(null);
          }
        }}
      />
    </div>
  );
}
