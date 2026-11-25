import { CheckCircle, XCircle, Lightbulb } from "lucide-react";
import Card from "../Card";
import PropTypes from "prop-types";

/**
 * One quiz question: the prompt, its options, and — once the quiz has been
 * submitted — the answer key with the explanation.
 *
 * Shared by the Quiz page and the All-in-One studio so both surfaces stay
 * identical instead of drifting apart. The layout is phone-first: the options
 * and the explanation only take the question's indent from `sm:` upwards,
 * because a 48px indent is a third of a 375px screen.
 */
export default function QuizQuestionCard({
  question,
  index,
  selectedAnswer,
  submitted,
  onSelect,
}) {
  const isCorrect = selectedAnswer === question.answer;
  const options = question.options || [];

  return (
    <Card
      variant={submitted ? "elevated" : "default"}
      accent={submitted ? (isCorrect ? "emerald" : "rose") : undefined}
      className={`
        mb-4 transition-all duration-300
        ${submitted && isCorrect ? "animate-fade-up" : ""}
      `}
    >
      {/* Question */}
      <div className="mb-4 flex flex-wrap items-start gap-x-3 gap-y-2">
        <span className="mt-0.5 flex-shrink-0 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-medium text-slate-700">
          Q{index + 1}
        </span>
        <p className="min-w-[12rem] flex-1 text-sm font-semibold leading-relaxed text-slate-900 sm:text-base">
          {question.question}
        </p>
        {submitted && (
          // A word, not only a colour: the badge is the answer for anyone who
          // cannot separate the emerald and rose tints.
          <span
            className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
              isCorrect
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {isCorrect ? (
              <CheckCircle size={13} aria-hidden="true" />
            ) : (
              <XCircle size={13} aria-hidden="true" />
            )}
            {isCorrect ? "Correct" : "Incorrect"}
          </span>
        )}
      </div>

      {/* Options */}
      <div
        role="radiogroup"
        aria-label={`Question ${index + 1} options`}
        className="space-y-2 sm:ml-12"
      >
        {options.map((opt) => {
          const isSelected = selectedAnswer === opt;
          const isCorrectOpt = submitted && opt === question.answer;
          const isWrongSelected = submitted && isSelected && opt !== question.answer;

          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={submitted}
              onClick={() => onSelect(opt)}
              className={`
                w-full rounded-xl border px-3 py-3 text-left text-sm transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white
                ${isCorrectOpt
                  ? "border-emerald-300 bg-emerald-50 font-medium text-emerald-900 shadow-sm"
                  : isWrongSelected
                  ? "border-rose-300 bg-rose-50 font-medium text-rose-900 shadow-sm"
                  : isSelected
                  ? "border-violet-300 bg-violet-50 font-medium text-violet-900 shadow-sm"
                  : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100"}
                ${submitted ? "cursor-default" : "cursor-pointer motion-safe:hover:-translate-y-[1px]"}
              `}
            >
              <span className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isCorrectOpt
                      ? "border-emerald-600 bg-emerald-600"
                      : isWrongSelected
                      ? "border-rose-600 bg-rose-600"
                      : isSelected
                      ? "border-violet-600 bg-violet-600"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isCorrectOpt ? (
                    <CheckCircle className="h-3 w-3 text-white" aria-hidden="true" />
                  ) : isWrongSelected ? (
                    <XCircle className="h-3 w-3 text-white" aria-hidden="true" />
                  ) : isSelected ? (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 break-words">{opt}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* The answer key, so a wrong answer can be read back without scrolling
          up to the options. */}
      {submitted && !isCorrect && (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 sm:ml-12">
          Correct answer: <span className="font-semibold">{question.answer}</span>
        </p>
      )}

      {/* Explanation */}
      {submitted && question.explanation && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-900 sm:ml-12 sm:p-4">
          <p className="mb-1 flex items-center gap-1.5 font-semibold text-amber-800">
            <Lightbulb size={14} className="flex-shrink-0" aria-hidden="true" />
            Explanation
          </p>
          {question.explanation}
        </div>
      )}
    </Card>
  );
}

QuizQuestionCard.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    question: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.string),
    answer: PropTypes.string,
    explanation: PropTypes.string,
  }).isRequired,
  index: PropTypes.number.isRequired,
  selectedAnswer: PropTypes.string,
  submitted: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
};
