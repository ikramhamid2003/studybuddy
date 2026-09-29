import { useState } from "react";
import { Eye, RotateCw } from "lucide-react";
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
      className="flashcard-scene h-52 cursor-pointer group select-none"
      onClick={handleFlip}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={flipped ? "Show question" : "Show answer"}
      aria-pressed={flipped}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={`flashcard-inner ${flipped ? "flipped" : ""}`}>
        {/* Front Face (Question) */}
        <div className="flashcard-face bg-gradient-to-br from-sky-50 via-indigo-50/50 to-white border-2 border-sky-200 hover:border-sky-400 rounded-2xl flex flex-col items-center justify-between p-6 text-center shadow-md hover:shadow-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
          <div className="flex items-center justify-between w-full">
            <span className="px-2.5 py-0.5 bg-sky-200/80 text-sky-800 text-[10px] font-mono uppercase tracking-widest rounded-full font-bold">
              Question #{index + 1}
            </span>
            <RotateCw size={13} className="text-sky-500 opacity-60 group-hover:opacity-100 group-hover:rotate-180 transition-all duration-500" />
          </div>
          
          <div className="my-auto py-2">
            <p className="text-slate-900 text-base font-bold leading-snug">{card.front}</p>
            {card.hint && (
              <p className="text-slate-600 text-xs mt-2 italic font-medium bg-sky-100/60 px-3 py-1 rounded-lg inline-block">
                💡 Hint: {card.hint}
              </p>
            )}
          </div>

          <div className="text-[11px] text-sky-600 font-semibold flex items-center gap-1 opacity-80 group-hover:opacity-100">
            <Eye size={13} /> Click or press Space to reveal answer
          </div>
        </div>

        {/* Back Face (Answer) */}
        <div className="flashcard-face flashcard-back-face bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border-2 border-emerald-300 rounded-2xl flex flex-col items-center justify-between p-6 text-center shadow-md transition-all duration-300">
          <div className="flex items-center justify-between w-full">
            <span className="px-2.5 py-0.5 bg-emerald-200/80 text-emerald-800 text-[10px] font-mono uppercase tracking-widest rounded-full font-bold">
              Answer
            </span>
            <RotateCw size={13} className="text-emerald-500 rotate-180" />
          </div>

          <div className="my-auto py-2">
            <p className="text-emerald-950 text-base font-bold leading-snug">
              {card.back}
            </p>
          </div>

          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            Click to flip back
          </div>
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
