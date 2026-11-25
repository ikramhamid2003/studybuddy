import { useRef } from "react";
import { RotateCcw, Download } from "lucide-react";
import Button from "../Button";
import Flashcard from "../shared/Flashcard";

export default function FlashcardsResult({ result, deckKey, onExportCSV, onResetCards }) {
  const cards = result.flashcards || [];
  const deckRef = useRef(null);

  // Arrow keys / Home / End move between cards so a keyboard user does not have
  // to Tab through the whole deck. Enter or Space on a card still flips it.
  const handleDeckKeyDown = (e) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys) && e.key !== "Home" && e.key !== "End") return;
    const items = Array.from(deckRef.current.querySelectorAll("[data-flashcard]"));
    const current = items.indexOf(document.activeElement);
    if (current === -1) return;
    e.preventDefault();
    let target = current + (keys[e.key] || 0);
    if (e.key === "Home") target = 0;
    if (e.key === "End") target = items.length - 1;
    items[Math.max(0, Math.min(items.length - 1, target))].focus();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 animate-fade-up">
        <span className="text-slate-500 text-xs font-mono">{cards.length} cards · click or press Space to flip · arrow keys move between cards</span>
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
      <div
        key={deckKey}
        ref={deckRef}
        role="group"
        aria-label={`Flashcards, ${cards.length} cards`}
        onKeyDown={handleDeckKeyDown}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <div key={card.id} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
            <Flashcard card={card} index={i} total={cards.length} />
          </div>
        ))}
      </div>
    </div>
  );
}
