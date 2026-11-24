import { CheckCircle, XCircle } from "lucide-react";
import Card from "../Card";
import Button from "../Button";
import ScoreCard from "../shared/ScoreCard";

export default function QuizResult({ result, answers, submitted, onSelectAnswer, onSubmitQuiz, onRetryQuiz }) {
  const questions = result.questions || [];
  const score = submitted ? questions.filter((q) => answers[q.id] === q.answer).length : 0;
  const answeredCount = Object.keys(answers).length;

  return (
    <div>
      {submitted && questions.length > 0 && (
        <ScoreCard score={score} total={questions.length} onRetry={onRetryQuiz} />
      )}
      {questions.map((q, qi) => {
        const userAns = answers[q.id];
        const isCorrect = userAns === q.answer;

        return (
          <Card
            key={q.id}
            variant={submitted ? (isCorrect ? "elevated" : "elevated") : "default"}
            accent={submitted ? (isCorrect ? "emerald" : "rose") : undefined}
            className={`${submitted && isCorrect ? "animate-fade-up" : ""}`}
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="font-mono text-xs text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 flex-shrink-0 mt-0.5 font-medium">
                Q{qi + 1}
              </span>
              <p className="text-slate-900 font-semibold text-sm leading-relaxed mt-1 flex-1">{q.question}</p>
              {submitted && (
                <div className="ml-auto flex-shrink-0 mt-1">
                  {isCorrect ? (
                    <CheckCircle className="text-emerald-600" size={20} />
                  ) : (
                    <XCircle className="text-rose-600" size={20} />
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2 ml-12">
              {q.options.map((option) => {
                const isSelected = userAns === option;
                const isCorrectOpt = submitted && option === q.answer;
                const isWrongSelected = submitted && isSelected && option !== q.answer;

                return (
                  <button
                    key={option}
                    onClick={() => onSelectAnswer(q.id, option)}
                    disabled={submitted}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all duration-200
                      ${
                        isCorrectOpt
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900 font-medium shadow-sm"
                          : isWrongSelected
                          ? "border-rose-300 bg-rose-50 text-rose-900 font-medium shadow-sm"
                          : isSelected
                          ? "border-violet-300 bg-violet-50 text-violet-900 font-medium shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 hover:border-slate-300"
                      }
                      ${submitted ? "cursor-default" : "cursor-pointer transform hover:-translate-y-[1px]"}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isCorrectOpt ? "border-emerald-600 bg-emerald-600" :
                        isWrongSelected ? "border-rose-600 bg-rose-600" :
                        isSelected ? "border-violet-600 bg-violet-600" :
                        "border-slate-300 bg-white"
                      }`}>
                        {isCorrectOpt || isWrongSelected ? (
                          <CheckCircle className="w-3 h-3 text-white" />
                        ) : isSelected ? (
                          <span className="w-2 h-2 rounded-full bg-white" />
                        ) : null}
                      </span>
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>

            {submitted && (
              <div className="ml-12 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed font-medium">
                <span className="text-amber-800 font-bold">💡 Explanation: </span>
                {q.explanation}
              </div>
            )}
          </Card>
        );
      })}

      {questions.length > 0 && !submitted && (
        <div className="flex items-center gap-4 mt-4 animate-fade-up">
          <Button onClick={() => onSubmitQuiz(questions)} size="md" color="violet">
            Submit Quiz ({answeredCount}/{questions.length})
          </Button>
          <span className="text-slate-500 text-xs font-mono">
            {questions.length - answeredCount} remaining
          </span>
        </div>
      )}
    </div>
  );
}
