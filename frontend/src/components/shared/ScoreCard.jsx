import { Trophy, RefreshCw } from "lucide-react";
import Card from "../Card";
import Button from "../Button";
import PropTypes from "prop-types";

/**
 * The result summary shown once a quiz has been submitted.
 *
 * The card lives on the app's light canvas, so the copy uses the light
 * palette (slate-600/700 on white) rather than the dark-canvas greys. The
 * accent fill keeps the near-black ink contract from `routeColors.js`.
 */
export default function ScoreCard({ score, total, onRetry }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const tone = pct >= 80 ? "emerald" : pct >= 50 ? "amber" : "rose";
  const textColor =
    pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600";
  const barColor =
    pct >= 80
      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
      : pct >= 50
      ? "bg-gradient-to-r from-amber-500 to-amber-400"
      : "bg-gradient-to-r from-rose-500 to-rose-400";
  const message =
    pct >= 80 ? "Excellent work! 🎉" : pct >= 50 ? "Good effort! 📚" : "Keep studying! 💪";

  return (
    <Card
      variant="elevated"
      accent={tone}
      className="animate-fade-up"
    >
      <div
        role="group"
        aria-label={`Quiz score: ${score} of ${total} correct, ${pct} percent`}
        className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left"
      >
        {/* Score */}
        <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-2">
          <Trophy
            className="h-10 w-10 flex-shrink-0 text-amber-500 motion-safe:animate-bounce sm:h-12 sm:w-12"
            aria-hidden="true"
          />
          <div>
            <div className={`font-display text-5xl leading-none sm:text-6xl ${textColor}`}>
              {pct}%
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {score} / {total} correct
            </p>
          </div>
        </div>

        {/* Message, progress and the one action this screen offers */}
        <div className="flex w-full flex-1 flex-col items-center gap-3 sm:items-end">
          <p className="text-sm font-medium text-slate-700">{message}</p>
          <div className="h-2.5 w-full max-w-xs overflow-hidden rounded-full border border-slate-300 bg-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <Button onClick={onRetry} variant="primary" color={tone} className="w-full sm:w-auto">
            <RefreshCw size={15} className="mr-1.5" />
            Try Again
          </Button>
        </div>
      </div>
    </Card>
  );
}

ScoreCard.propTypes = {
  score: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  onRetry: PropTypes.func.isRequired,
};
