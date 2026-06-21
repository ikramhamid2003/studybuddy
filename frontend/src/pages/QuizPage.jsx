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
  const color = pct >= 80 ? "text-emerald-450 font-black" : pct >= 50 ? "text-amber-450 font-semibold" : "text-rose-450";
  const barColor = pct >= 80 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : pct >= 50 ? "bg-gradient-to-r from-amber-500 to-amber-400" : "bg-gradient-to-r from-rose-500 to-rose-400";
  const message = pct >= 80 ? "Excellent work! 🎉" : pct >= 50 ? "Good effort! 📚" : "Keep studying! 💪";

  return (
    <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 text-center mb-6 shadow-2xl animate-fade-up">
      <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-bounce" />
      <div className={`font-display text-6xl mb-1 ${color}`}>{pct}%</div>
      <p className="text-slate-400 text-sm mb-1">{score} / {total} correct</p>
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
              mb-4 rounded-2xl border p-5 transition-all duration-300 backdrop-blur-md
              ${submitted
                ? isCorrect
                  ? "bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.03)]"
                  : "bg-rose-500/5 border-rose-500/30 shadow-[0_0_25px_rgba(244,63,94,0.03)]"
                : "bg-slate-900/40 border-slate-800/80 shadow-md"
              }
            `}
          >
            {/* Question */}
            <div className="flex items-start gap-3 mb-4">
              <span className="font-mono text-xs text-slate-400 bg-slate-850/80 border border-slate-800 rounded-lg px-2.5 py-1.5 flex-shrink-0 mt-0.5 shadow-inner">
                Q{qi + 1}
              </span>
              <p className="text-white font-semibold text-sm leading-relaxed mt-1">{q.question}</p>
              {submitted && (
                <div className="ml-auto flex-shrink-0 mt-1">
                  {isCorrect
                    ? <CheckCircle className="text-emerald-400" size={20} />
                    : <XCircle className="text-rose-400" size={20} />}
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2 ml-12">
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
                      w-full text-left px-4 py-3 rounded-xl text-sm border transition-all duration-200
                      ${isCorrectOpt
                        ? "border-emerald-500/40 bg-emerald-550/10 text-emerald-350 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                        : isWrongSelected
                        ? "border-rose-500/40 bg-rose-550/10 text-rose-350 shadow-[0_0_15px_rgba(244,63,94,0.05)]"
                        : isSelected
                        ? "border-violet-500/40 bg-violet-550/10 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.05)]"
                        : "border-slate-800/80 bg-slate-900/40 text-slate-350 hover:border-slate-700 hover:bg-slate-800/50"
                      }
                      ${submitted ? "cursor-default" : "cursor-pointer transform hover:-translate-y-[1px] hover:shadow-sm"}
                    `}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {submitted && (
              <div className="ml-12 mt-4 p-4 bg-slate-950/60 border border-slate-850/80 rounded-xl text-xs text-slate-400 leading-relaxed shadow-inner">
                <span className="text-amber-400 font-semibold">💡 Explanation: </span>
                {q.explanation}
              </div>
            )}
          </div>
        );
      })}

      {questions.length > 0 && !submitted && (
        <div className="flex items-center gap-4 mt-4">
          <Button onClick={submitQuiz} size="md">
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
