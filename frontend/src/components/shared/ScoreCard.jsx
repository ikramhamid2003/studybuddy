import { Trophy, RefreshCw } from "lucide-react";
import Card from "../Card";
import Button from "../Button";
import PropTypes from "prop-types";

export default function ScoreCard({ score, total, onRetry }) {
  const pct = Math.round((score / total) * 100);
  const color =
    pct >= 80 ? "text-emerald-450 font-black" : pct >= 50 ? "text-amber-450 font-semibold" : "text-rose-450";
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
      accent={pct >= 80 ? "emerald" : pct >= 50 ? "amber" : "rose"}
      className="text-center animate-fade-up"
    >
      <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-bounce" />
      <div className={`font-display text-6xl mb-1 ${color}`}>{pct}%</div>
      <p className="text-slate-400 text-sm mb-1">
        {score} / {total} correct
      </p>
      <p className="text-slate-200 font-medium mb-5">{message}</p>
      <div className="w-full h-2.5 bg-slate-950/60 rounded-full overflow-hidden mb-5 mx-auto max-w-xs border border-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <Button onClick={onRetry} variant="secondary">
        <RefreshCw size={15} className="mr-1.5" />
        Try Again
      </Button>
    </Card>
  );
}

ScoreCard.propTypes = {
  score: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  onRetry: PropTypes.func.isRequired,
};
