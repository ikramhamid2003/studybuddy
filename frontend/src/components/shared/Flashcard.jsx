import { useState } from "react";
import { Eye } from "lucide-react";
import PropTypes from "prop-types";

export default function Flashcard({ card, index = 0 }) {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => setFlipped((f) => !f);
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleFlip();
    }
  };

  return (
    <div
      className="flashcard-scene h-48 cursor-pointer group"
      onClick={handleFlip}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={flipped ? "Show question" : "Show answer"}
      aria-pressed={flipped}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={`flashcard-inner ${flipped ? "flipped" : ""}`}>
        <div className="flashcard-face backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center p-6 text-center hover:border-sky-500/40 hover:shadow-[0_0_25px_rgba(14,165,233,0.12)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
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
        <div className="flashcard-face flashcard-back-face backdrop-blur-md bg-slate-850/80 border border-emerald-500/30 rounded-2xl flex flex-col items-center justify-center p-6 text-center shadow-[0_0_25px_rgba(16,185,129,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
          <span className="text-emerald-400/80 text-[10px] font-mono uppercase tracking-widest mb-3">
            Answer
          </span>
          <p className="text-emerald-100 text-sm font-semibold leading-relaxed">
            {card.back}
          </p>
        </div>
      </div>
    </div>
  );
}

Flashcard.propTypes = {
  card: PropTypes.shape({
    front: PropTypes.string.isRequired,
    back: PropTypes.string.isRequired,
    hint: PropTypes.string,
  }).isRequired,
  index: PropTypes.number,
};
