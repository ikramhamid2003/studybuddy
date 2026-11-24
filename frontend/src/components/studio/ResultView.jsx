import ExplainResult from "./ExplainResult";
import SummarizeResult from "./SummarizeResult";
import QuizResult from "./QuizResult";
import FlashcardsResult from "./FlashcardsResult";
import ChatReplyResult from "./ChatReplyResult";

/**
 * Central render switch: the All page's five tools share one result surface,
 * whether the result was just generated or reopened from history.
 */
export default function ResultView({
  active,
  answers,
  submitted,
  onSelectAnswer,
  onSubmitQuiz,
  onRetryQuiz,
  onExportCSV,
  onResetCards,
  deckKey,
}) {
  const { type, result } = active;

  if (type === "explain") return <ExplainResult result={result} />;
  if (type === "summarize") return <SummarizeResult result={result} />;
  if (type === "quiz") {
    return (
      <QuizResult
        result={result}
        answers={answers}
        submitted={submitted}
        onSelectAnswer={onSelectAnswer}
        onSubmitQuiz={onSubmitQuiz}
        onRetryQuiz={onRetryQuiz}
      />
    );
  }
  if (type === "flashcards") {
    return (
      <FlashcardsResult
        result={result}
        deckKey={deckKey}
        onExportCSV={onExportCSV}
        onResetCards={onResetCards}
      />
    );
  }
  // chat — single saved reply (history view)
  return <ChatReplyResult result={result} />;
}
