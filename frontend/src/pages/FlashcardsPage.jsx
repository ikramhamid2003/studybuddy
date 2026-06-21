import { useState } from "react";
import toast from "react-hot-toast";
import { Layers, RotateCcw, Eye, Download } from "lucide-react";
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
      className="flashcard-scene h-48 cursor-pointer group"
      onClick={() => setFlipped((f) => !f)}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={`flashcard-inner ${flipped ? "flipped" : ""}`}>
        {/* Front */}
        <div className="flashcard-face backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center p-6 text-center hover:border-sky-500/40 hover:shadow-[0_0_25px_rgba(14,165,233,0.12)] transition-all duration-300">
          <span className="text-sky-400/80 text-[10px] font-mono uppercase tracking-widest mb-3">
            Question
          </span>
          <p className="text-white text-sm font-semibold leading-relaxed">{card.front}</p>
          {card.hint && (
            <p className="text-slate-500 text-xs mt-3 italic font-light">Hint: {card.hint}</p>
          )}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye size={14} className="text-sky-400 animate-pulse" />
          </div>
        </div>

        {/* Back */}
        <div className="flashcard-face flashcard-back-face backdrop-blur-md bg-slate-850/80 border border-emerald-500/30 rounded-2xl flex flex-col items-center justify-center p-6 text-center shadow-[0_0_25px_rgba(16,185,129,0.06)]">
          <span className="text-emerald-400/80 text-[10px] font-mono uppercase tracking-widest mb-3">
            Answer
          </span>
          <p className="text-emerald-100 text-sm font-semibold leading-relaxed">{card.back}</p>
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

  function exportCSV() {
    if (!cards.length) return;
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
                onClick={() => setKey((k) => k + 1)}
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
        <div className="text-center py-16">
          <Layers className="text-slate-700 w-16 h-16 mx-auto mb-4" />
          <p className="text-slate-600 text-sm">Enter a topic to generate your flashcard deck</p>
        </div>
      )}
    </div>
  );
}
