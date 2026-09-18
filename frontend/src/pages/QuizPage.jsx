import { useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Trophy, ArrowRight } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input, Select } from "../components/Input";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ToolHistory from "../components/ToolHistory";
import ScoreCard from "../components/shared/ScoreCard";
import { generateAll } from "../utils/api";

export default function QuizPage() {
  const queryClient = useQueryClient();
  // Quiz state is split between generated questions, selected answers, and the
  // submission flag so users can answer freely before grading.
  const [topic, setTopic] = useState("");
  const [numQ, setNumQ] = useState("5");
  const [difficulty, setDifficulty] = useState("medium");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState(null);

  async function handleGenerate() {
    if (!topic.trim()) return toast.error("Please enter a topic");
    setLoading(true);
    // Reset old quiz state before requesting a new set of questions.
    setQuestions([]); setAnswers({}); setSubmitted(false);
    try {
      const data = await generateAll(topic.trim(), "quiz", {
        num_questions: parseInt(numQ),
        difficulty,
      });
      if (!data.questions?.length) throw new Error("No questions returned");
      setQuestions(data.questions);
      setActiveHistoryId(data.generation_id ?? null);
      queryClient.invalidateQueries({ queryKey: ["generations", "quiz"] });
      toast.success(`${data.questions.length} questions ready!`);
    } catch (err) {
      toast.error(err.message || "Quiz generation failed.");
    } finally {
      setLoading(false);
    }
  }

  function selectAnswer(qId, option) {
    if (submitted) return;
    // Answers are keyed by question id to survive rendering/order changes.
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
            leftIcon={<Trophy className="w-4 h-4" />}
          />
          <Select label="Questions" value={numQ} onChange={(e) => setNumQ(e.target.value)} className="sm:w-36" color="violet">
            <option value="3">3</option>
            <option value="5">5</option>
            <option value="8">8</option>
          </Select>
          <Select label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="sm:w-40" color="violet">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
        </div>
        <div className="mt-4">
          <Button onClick={handleGenerate} loading={loading} disabled={!topic.trim()}>
            <ArrowRight size={16} />
            Generate Quiz
          </Button>
        </div>
      </Card>

      {loading && (
        <Card variant="elevated">
          <LoadingSkeleton lines={6} message="Writing your quiz questions..." variant="card" />
        </Card>
      )}

      {submitted && questions.length > 0 && (
        <ScoreCard score={score} total={questions.length} onRetry={() => { setQuestions([]); setAnswers({}); setSubmitted(false); }} />
      )}

      {questions.map((q, qi) => {
        const userAns = answers[q.id];
        const isCorrect = userAns === q.answer;

        return (
          <Card
            key={q.id}
            variant={submitted ? (isCorrect ? "elevated" : "elevated") : "default"}
            accent={submitted ? (isCorrect ? "emerald" : "rose") : undefined}
            className={`
              mb-4 transition-all duration-300
              ${submitted && isCorrect ? "animate-fade-up" : ""}
            `}
          >
            {/* Question */}
            <div className="flex items-start gap-3 mb-4">
              <span className="font-mono text-xs text-slate-400 bg-slate-850/80 border border-slate-800 rounded-lg px-2.5 py-1.5 flex-shrink-0 mt-0.5 shadow-inner">
                Q{qi + 1}
              </span>
              <p className="text-white font-semibold text-sm leading-relaxed mt-1 flex-1">{q.question}</p>
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
                    <span className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isCorrectOpt ? "border-emerald-500 bg-emerald-500" :
                        isWrongSelected ? "border-rose-500 bg-rose-500" :
                        isSelected ? "border-violet-500 bg-violet-500" :
                        "border-slate-700"
                      }`}>
                        {isCorrectOpt || isWrongSelected ? (
                          <CheckCircle className="w-3 h-3 text-white" />
                        ) : isSelected ? (
                          <span className="w-2 h-2 rounded-full bg-white" />
                        ) : null}
                      </span>
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {submitted && (
              <div className="ml-12 mt-4 p-4 bg-slate-950/60 border border-slate-850/80 rounded-xl text-xs text-slate-300 leading-relaxed shadow-inner">
                <span className="text-amber-400 font-semibold">💡 Explanation: </span>
                {q.explanation}
              </div>
            )}
          </Card>
        );
      })}

      {questions.length > 0 && !submitted && (
        <div className="flex items-center gap-4 mt-4 animate-fade-up">
          <Button onClick={submitQuiz} size="md" color="violet">
            Submit Quiz ({answeredCount}/{questions.length})
          </Button>
          <span className="text-slate-500 text-xs font-mono">
            {questions.length - answeredCount} remaining
          </span>
        </div>
      )}

      <ToolHistory
        type="quiz"
        activeId={activeHistoryId}
        onSelect={(item) => {
          // History reopens saved questions but intentionally clears previous
          // answers so the quiz can be retaken.
          setTopic(item.topic);
          setQuestions(item.result.questions || []);
          setAnswers({});
          setSubmitted(false);
          setActiveHistoryId(item.id);
        }}
      />
    </div>
  );
}
