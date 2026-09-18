import { useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Layers, RotateCcw, Download, ArrowRight } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input, Select } from "../components/Input";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ToolHistory from "../components/ToolHistory";
import Flashcard from "../components/shared/Flashcard";
import { generateAll } from "../utils/api";

export default function FlashcardsPage() {
  const queryClient = useQueryClient();
  // `key` forces React to remount cards when resetting every flipped card.
  const [topic, setTopic] = useState("");
  const [numCards, setNumCards] = useState("8");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [key, setKey] = useState(0); // used to reset all cards
  const [activeHistoryId, setActiveHistoryId] = useState(null);

  async function handleGenerate() {
    if (!topic.trim()) return toast.error("Please enter a topic");
    setLoading(true);
    // Clear old cards while the new deck is being generated.
    setCards([]);
    try {
      const data = await generateAll(topic.trim(), "flashcards", {
        num_cards: parseInt(numCards),
      });
      if (!data.flashcards?.length) throw new Error("No flashcards returned");
      setCards(data.flashcards);
      setActiveHistoryId(data.generation_id ?? null);
      setKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: ["generations", "flashcards"] });
      toast.success(`${data.flashcards.length} flashcards created!`);
    } catch (err) {
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

  return (
    <div>
      <PageHeader
        icon="🃏"
        title="Flashcards"
        subtitle="Click any card to flip it and reveal the answer"
      />

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
              <Button
                variant="ghost"
                size="sm"
                onClick={exportCSV}
              >
                <Download size={13} />
                Export CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
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
        </>
      )}

      {cards.length === 0 && !loading && (
        <Card variant="outlined" className="text-center py-12 animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4 border border-slate-800">
            <Layers className="text-slate-500" size={32} />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">No flashcards yet</p>
          <p className="text-slate-600 text-xs font-light max-w-xs mx-auto">
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
          setActiveHistoryId(item.id);
          setKey((k) => k + 1);
        }}
      />
    </div>
  );
}
