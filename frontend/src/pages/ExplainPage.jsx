import { useState } from "react";
import toast from "react-hot-toast";
import { Lightbulb, ArrowRight, BookMarked, Puzzle } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input, Select } from "../components/Input";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { explainTopic } from "../utils/api";

export default function ExplainPage() {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("beginner");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleExplain() {
    if (!topic.trim()) return toast.error("Please enter a topic");
    setLoading(true);
    setResult(null);
    try {
      const data = await explainTopic(topic.trim(), level);
      setResult(data);
      toast.success("Explanation ready!");
    } catch (err) {
      toast.error(err.message || "Failed to explain. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        icon="🔍"
        title="Explain a Concept"
        subtitle="Get any topic broken down simply, with analogies and real examples"
      />

      {/* Input Card */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            label="Topic or Concept"
            placeholder="e.g. Photosynthesis, Quantum entanglement, The French Revolution..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleExplain()}
            className="flex-1"
          />
          <Select
            label="Level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="sm:w-40"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </Select>
        </div>
        <div className="mt-4">
          <Button
            onClick={handleExplain}
            loading={loading}
            disabled={!topic.trim()}
            size="md"
          >
            <ArrowRight size={16} />
            Explain This
          </Button>
        </div>
      </Card>

      {/* Loading */}
      {loading && (
        <Card>
          <LoadingSkeleton lines={4} message="Crafting your explanation..." />
        </Card>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4 animate-fade-up">
          {/* Main explanation */}
          <Card accent="amber">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="text-amber-400" size={18} />
              <span className="text-amber-400 text-xs font-mono uppercase tracking-widest">
                Explanation
              </span>
              <span className="ml-auto text-xs font-mono text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
                {level}
              </span>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed">{result.explanation}</p>
          </Card>

          {/* Key Points */}
          {result.key_points?.length > 0 && (
            <Card accent="emerald">
              <div className="flex items-center gap-2 mb-3">
                <BookMarked className="text-emerald-400" size={18} />
                <span className="text-emerald-400 text-xs font-mono uppercase tracking-widest">
                  Key Points
                </span>
              </div>
              <ul className="space-y-2">
                {result.key_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="text-emerald-400 font-bold mt-0.5 flex-shrink-0">→</span>
                    {point}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Analogy */}
            {result.analogy && (
              <Card accent="violet">
                <div className="flex items-center gap-2 mb-3">
                  <Puzzle className="text-violet-400" size={18} />
                  <span className="text-violet-400 text-xs font-mono uppercase tracking-widest">
                    Analogy
                  </span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed italic">{result.analogy}</p>
              </Card>
            )}

            {/* Example */}
            {result.example && (
              <Card accent="sky">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sky-400 text-xs font-mono uppercase tracking-widest">
                    📖 Example
                  </span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{result.example}</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
