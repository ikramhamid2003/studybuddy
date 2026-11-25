import { useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Trophy, ArrowRight } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input, Select } from "../components/Input";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ToolHistory from "../components/ToolHistory";
import QuizResults from "../components/shared/QuizResults";
import DocumentPicker from "../components/shared/DocumentPicker";
import DocumentSources from "../components/shared/DocumentSources";
import GroundingNote from "../components/shared/GroundingNote";
import { docIdsOption } from "../components/shared/documentLibrary";
import { useGenerationAbort } from "../components/shared/generationAbort";
import { useLibrary } from "../context/DocumentLibraryContext";
import { generateAll } from "../utils/api";
import { usePendingTopic } from "../utils/pendingTopic";

export default function QuizPage() {
  const queryClient = useQueryClient();
  const library = useLibrary();
  const abort = useGenerationAbort();
  // Quiz state is split between generated questions, selected answers, and the
  // submission flag so users can answer freely before grading.
  // Picks up a topic typed into the home focus box, if one was stashed.
  const [topic, setTopic] = useState("");
  usePendingTopic(setTopic);
  const [numQ, setNumQ] = useState("5");
  const [difficulty, setDifficulty] = useState("medium");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState(null);

  function clearQuiz() {
    setQuestions([]); setAnswers({}); setSubmitted(false); setSources([]);
  }

  async function handleGenerate() {
    if (!topic.trim()) return toast.error("Please enter a topic");
    setLoading(true);
    // Reset old quiz state before requesting a new set of questions.
    clearQuiz();
    try {
      const data = await generateAll(
        topic.trim(),
        "quiz",
        {
          num_questions: parseInt(numQ),
          difficulty,
          ...docIdsOption(library.selectedIds),
        },
        abort.start()
      );
      if (!data.questions?.length) throw new Error("No questions returned");
      setQuestions(data.questions);
      setSources(data.sources || []);
      setActiveHistoryId(data.generation_id ?? null);
      queryClient.invalidateQueries({ queryKey: ["generations", "quiz"] });
      queryClient.invalidateQueries({ queryKey: ["usage_stats"] });
      toast.success(`${data.questions.length} questions ready!`);
    } catch (err) {
      // Navigating away cancels the request; that is not a failure to report.
      if (abort.isAbort(err)) return;
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        icon="🧪"
        title="Quiz Generator"
        subtitle="Test your knowledge with AI-generated multiple-choice questions"
      />

      {/* Grounding: upload button + document dropdown, the shared document library */}
      <DocumentPicker library={library} title="Ground the quiz in my documents" />

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
          <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
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
        </div>
        <div className="mt-4">
          <Button onClick={handleGenerate} loading={loading} disabled={!topic.trim()}>
            <ArrowRight size={16} />
            Generate Quiz
          </Button>
        </div>
      </Card>

      <GroundingNote />

      {loading && (
        <Card variant="elevated">
          <LoadingSkeleton lines={6} message="Writing your quiz questions..." variant="card" />
        </Card>
      )}

      {/* The score card, the question list and the submit bar — one shared
          surface, so this page and the All-in-One Studio stay identical. */}
      {questions.length > 0 && (
        <QuizResults
          questions={questions}
          answers={answers}
          submitted={submitted}
          onSelectAnswer={selectAnswer}
          onSubmit={submitQuiz}
          onRetry={clearQuiz}
        />
      )}

      <DocumentSources sources={sources} className="mb-6" />

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
          setSources(item.result.sources || []);
          setActiveHistoryId(item.id);
        }}
        onDeleted={(id) => {
          // Clear the open quiz when the entry backing it is removed.
          if (activeHistoryId === id) {
            clearQuiz();
            setActiveHistoryId(null);
          }
        }}
      />
    </div>
  );
}
