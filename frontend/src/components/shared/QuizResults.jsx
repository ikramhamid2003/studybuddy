import ScoreCard from "./ScoreCard";
import QuizQuestionCard from "./QuizQuestionCard";
import Button from "../Button";
import PropTypes from "prop-types";

/**
 * The graded / ungraded quiz surface shared by the Quiz page and the
 * All-in-One Studio: the score card, the question list and the submit bar.
 *
 * Both pages render the same question payload, so the layout lives in one
 * place instead of being copied per page — the two surfaces cannot drift
 * apart, and a fix to the phone layout lands on both at once.
 */
export default function QuizResults({
  questions = [],
  answers = {},
  submitted = false,
  onSelectAnswer,
  onSubmit,
  onRetry,
}) {
  const answeredCount = Object.keys(answers).length;
  const score = submitted
    ? questions.filter((q) => answers[q.id] === q.answer).length
    : 0;

  return (
    <div>
      {submitted && questions.length > 0 && (
        <>
          <ScoreCard score={score} total={questions.length} onRetry={onRetry} />
          {/* A heading separates the summary from the review list, so a long
              quiz reads as "your score" followed by "your answers". */}
          <div className="mb-3 mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="font-display text-lg font-bold text-slate-900">Your answers</h3>
            <p className="font-mono text-xs text-slate-500">
              {score} of {questions.length} correct
            </p>
          </div>
        </>
      )}

      {questions.map((q, qi) => (
        <QuizQuestionCard
          key={q.id}
          question={q}
          index={qi}
          selectedAnswer={answers[q.id]}
          submitted={submitted}
          onSelect={(option) => onSelectAnswer(q.id, option)}
        />
      ))}

      {questions.length > 0 && !submitted && (
        /* Stacks on a phone: a long label next to a wide button used to run
           off the side of a narrow screen. */
        <div className="mt-4 flex flex-col gap-2 animate-fade-up sm:flex-row sm:items-center sm:gap-4">
          <Button onClick={() => onSubmit(questions)} size="md" color="violet" className="w-full sm:w-auto">
            Submit Quiz ({answeredCount}/{questions.length})
          </Button>
          <span className="text-center font-mono text-xs text-slate-500 sm:text-left">
            {questions.length - answeredCount} remaining
          </span>
        </div>
      )}
    </div>
  );
}

QuizResults.propTypes = {
  questions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      question: PropTypes.string,
      answer: PropTypes.string,
      explanation: PropTypes.string,
      options: PropTypes.arrayOf(PropTypes.string),
    })
  ),
  answers: PropTypes.object,
  submitted: PropTypes.bool,
  onSelectAnswer: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onRetry: PropTypes.func,
};
