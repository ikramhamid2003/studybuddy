import { RotateCcw, Download } from "lucide-react";
import Button from "../Button";
import Flashcard from "../shared/Flashcard";

export default function FlashcardsResult({ result, deckKey, onExportCSV, onResetCards }) {
  const cards = result.flashcards || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 animate-fade-up">
        <span className="text-slate-500 text-xs font-mono">{cards.length} cards · click or press Space to flip</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onExportCSV}>
            <Download size={13} />
            Export CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={onResetCards}>
            <RotateCcw size={13} />
            Reset All
          </Button>
        </div>
      </div>
      <div key={deckKey} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <div key={card.id} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
            <Flashcard card={card} index={i} />
          </div>
        ))}
      </div>
    </div>
  );
}
