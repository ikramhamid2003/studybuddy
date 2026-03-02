import { useState } from "react";
import toast from "react-hot-toast";
import { Layers, RotateCcw, Eye } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input, Select } from "../components/Input";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { generateFlashcards } from "../utils/api";

function Flashcard({ card, index }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="flashcard-scene h-44 cursor-pointer group"
      onClick={() => setFlipped((f) => !f)}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={`flashcard-inner ${flipped ? "flipped" : ""}`}>
        {/* Front */}
        <div className="flashcard-face bg-slate-900 border border-slate-700 rounded-2xl flex flex-col items-center justify-center p-5 text-center hover:border-slate-600 transition-colors group-hover:shadow-card">
          <span className="text-slate-600 text-xs font-mono uppercase tracking-widest mb-3">
            Question
          </span>
          <p className="text-white text-sm font-medium leading-relaxed">{card.front}</p>
          {card.hint && (
            <p className="text-slate-600 text-xs mt-3 italic">Hint: {card.hint}</p>
          )}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye size={14} className="text-slate-600" />
          </div>
        </div>

        {/* Back */}
        <div className="flashcard-face flashcard-back-face bg-slate-800 border border-amber-400/20 rounded-2xl flex flex-col items-center justify-center p-5 text-center">
          <span className="text-amber-400/60 text-xs font-mono uppercase tracking-widest mb-3">
            Answer
          </span>
          <p className="text-amber-100 text-sm leading-relaxed">{card.back}</p>
        </div>
      </div>
    </div>
  );
}

export default function FlashcardsPage() {
  const [topic, setTopic] = useState("");
  const [numCards, setNumCards] = useState("8");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [key, setKey] = useState(0); // used to reset all cards

  async function handleGenerate() {
    if (!topic.trim()) return toast.error("Please enter a topic");
    setLoading(true);
    setCards([]);
    try {
      const data = await generateFlashcards(topic.trim(), parseInt(numCards));
      if (!data.flashcards?.length) throw new Error("No flashcards returned");
      setCards(data.flashcards);
      setKey((k) => k + 1);
      toast.success(`${data.flashcards.length} flashcards created!`);
    } catch (err) {
      toast.error(err.message || "Flashcard generation failed.");
    } finally {
      setLoading(false);
    }
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
          />
          <Select
            label="Number of Cards"
            value={numCards}
            onChange={(e) => setNumCards(e.target.value)}
            className="sm:w-44"
          >
            <option value="5">5 cards</option>
            <option value="8">8 cards</option>
            <option value="10">10 cards</option>
            <option value="15">15 cards</option>
          </Select>
        </div>
        <div className="mt-4">
          <Button onClick={handleGenerate} loading={loading} disabled={!topic.trim()}>
            <Layers size={16} />
            Generate Deck
          </Button>
        </div>
      </Card>

      {loading && (
        <Card>
          <LoadingSkeleton lines={3} message="Creating your flashcard deck..." />
        </Card>
      )}

      {cards.length > 0 && !loading && (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-xs font-mono">
              {cards.length} cards · click to flip
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setKey((k) => k + 1)}
            >
              <RotateCcw size={13} />
              Reset All
            </Button>
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
        <div className="text-center py-16">
          <Layers className="text-slate-700 w-16 h-16 mx-auto mb-4" />
          <p className="text-slate-600 text-sm">Enter a topic to generate your flashcard deck</p>
        </div>
      )}
    </div>
  );
}
