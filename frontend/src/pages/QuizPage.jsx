import { useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, Trophy, RefreshCw } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input, Select } from "../components/Input";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { generateQuiz } from "../utils/api";

function ScoreCard({ score, total, onRetry }) {
  const pct = Math.round((score / total) * 100);
  const color = pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-rose-400";
  const barColor = pct >= 80 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-rose-400";
  const message = pct >= 80 ? "Excellent work! 🎉" : pct >= 50 ? "Good effort! 📚" : "Keep studying! 💪";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center mb-6 shadow-card animate-fade-up">
      <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-4" />
      <div className={`font-display text-6xl font-black mb-1 ${color}`}>{pct}%</div>
      <p className="text-slate-400 text-sm mb-1">{score} / {total} correct</p>
      <p className="text-slate-300 font-medium mb-5">{message}</p>
      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-5 mx-auto max-w-xs">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <Button onClick={onRetry} variant="secondary">
        <RefreshCw size={15} />
        Try Again
      </Button>
    </div>
  );
}

export default function QuizPage() {
  const [topic, setTopic] = useState("");
  const [numQ, setNumQ] = useState("5");
  const [difficulty, setDifficulty] = useState("medium");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (!topic.trim()) return toast.error("Please enter a topic");
    setLoading(true);
    setQuestions([]); setAnswers({}); setSubmitted(false);
    try {
      const data = await generateQuiz(topic.trim(), parseInt(numQ), difficulty);
      if (!data.questions?.length) throw new Error("No questions returned");
      setQuestions(data.questions);
      toast.success(`${data.questions.length} questions ready!`);
    } catch (err) {
      toast.error(err.message || "Quiz generation failed.");
    } finally {
      setLoading(false);
    }
  }

  function selectAnswer(qId, option) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qId]: option }));
  }

  function submitQuiz() {
    if (Object.keys(answers).length < questions.length) {
      return toast.error(`Answer all ${questions.length} questions first`);
    }
    setSubmitted(true);
  }

  const score = submitted ? questions.filter((q) => answers[q.id] === q.answer).length : 0;
  const answeredCount = Object.keys(answers).length;

  return (
    <div>
      <PageHeader
        icon="🧪"
        title="Quiz Generator"
        subtitle="Test your knowledge with AI-generated multiple-choice questions"
      />

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            label="Topic"
            placeholder="e.g. World War II, Python programming, Cell biology..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            className="flex-1"
          />
          <Select label="Questions" value={numQ} onChange={(e) => setNumQ(e.target.value)} className="sm:w-36">
            <option value="3">3</option>
            <option value="5">5</option>
            <option value="8">8</option>
          </Select>
          <Select label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="sm:w-40">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
        </div>
        <div className="mt-4">
          <Button onClick={handleGenerate} loading={loading} disabled={!topic.trim()}>
            Generate Quiz
          </Button>
        </div>
      </Card>

      {loading && (
        <Card>
          <LoadingSkeleton lines={6} message="Writing your quiz questions..." />
        </Card>
      )}

      {submitted && questions.length > 0 && (
        <ScoreCard score={score} total={questions.length} onRetry={() => { setQuestions([]); setAnswers({}); setSubmitted(false); }} />
      )}

      {questions.map((q, qi) => {
        const userAns = answers[q.id];
        const isCorrect = userAns === q.answer;

        return (
          <div
            key={q.id}
            className={`
              mb-4 rounded-2xl border p-5 transition-all duration-200
              ${submitted
                ? isCorrect
                  ? "bg-emerald-500/5 border-emerald-500/30"
                  : "bg-rose-500/5 border-rose-500/30"
                : "bg-slate-900 border-slate-800"
              }
            `}
          >
            {/* Question */}
            <div className="flex items-start gap-3 mb-4">
              <span className="font-mono text-xs text-slate-600 bg-slate-800 rounded-lg px-2 py-1 flex-shrink-0 mt-0.5">
                Q{qi + 1}
              </span>
              <p className="text-white font-medium text-sm leading-relaxed">{q.question}</p>
              {submitted && (
                <div className="ml-auto flex-shrink-0">
                  {isCorrect
                    ? <CheckCircle className="text-emerald-400" size={20} />
                    : <XCircle className="text-rose-400" size={20} />}
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2 ml-10">
              {q.options.map((opt) => {
                const isSelected = userAns === opt;
                const isCorrectOpt = submitted && opt === q.answer;
                const isWrongSelected = submitted && isSelected && opt !== q.answer;

                return (
                  <button
                    key={opt}
                    onClick={() => selectAnswer(q.id, opt)}
                    disabled={submitted}
                    className={`
                      w-full text-left px-4 py-2.5 rounded-xl text-sm border transition-all duration-150
                      ${isCorrectOpt
                        ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-300"
                        : isWrongSelected
                        ? "border-rose-400/60 bg-rose-500/10 text-rose-300"
                        : isSelected
                        ? "border-violet-400/60 bg-violet-500/10 text-violet-200"
                        : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800"
                      }
                      ${submitted ? "cursor-default" : "cursor-pointer"}
                    `}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {submitted && (
              <div className="ml-10 mt-3 p-3 bg-slate-800/60 rounded-xl text-xs text-slate-400 leading-relaxed">
                <span className="text-amber-400 font-semibold">💡 </span>
                {q.explanation}
              </div>
            )}
          </div>
        );
      })}

      {questions.length > 0 && !submitted && (
        <div className="flex items-center gap-4 mt-2">
          <Button onClick={submitQuiz} size="md">
            Submit Quiz ({answeredCount}/{questions.length})
          </Button>
          <span className="text-slate-600 text-xs font-mono">
            {questions.length - answeredCount} remaining
          </span>
        </div>
      )}
    </div>
  );
}
