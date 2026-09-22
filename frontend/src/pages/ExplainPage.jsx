import { useState } from "react";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, ArrowRight, BookMarked, Puzzle, Copy, Check } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input, Select } from "../components/Input";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ToolHistory from "../components/ToolHistory";
import { generateAll } from "../utils/api";
import { copyToClipboard } from "../utils/clipboard";

export default function ExplainPage() {
  const queryClient = useQueryClient();
  // Local state mirrors the form controls and the currently displayed result.
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("beginner");
  const [result, setResult] = useState(null);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [copied, setCopied] = useState(false);
  const { mutate, isPending: loading } = useMutation({
    mutationFn: () => generateAll(topic.trim(), "explain", { level }),
    onSuccess: (data) => {
      // Store the generated payload locally and refresh the filtered history
      // list so this result appears immediately below the tool.
      setResult(data);
      setActiveHistoryId(data.generation_id ?? null);
      queryClient.invalidateQueries({ queryKey: ["generations", "explain"] });
      toast.success("Explanation ready!");
    },
    onError: (err) => toast.error(err.message || "Failed to explain. Try again.")
  });

  function handleExplain() {
    if (!topic.trim()) return toast.error("Please enter a topic");
    mutate();
  }

  const fullText = result
    ? [
        result.explanation,
        result.key_points?.length ? `\n\nKey Points:\n${result.key_points.map(p => `• ${p}`).join("\n")}` : "",
        result.analogy ? `\n\nAnalogy:\n${result.analogy}` : "",
        result.example ? `\n\nExample:\n${result.example}` : "",
      ].filter(Boolean).join("")
    : "";

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
            leftIcon={<Lightbulb className="w-4 h-4" />}
          />
          <Select
            label="Level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="sm:w-40"
            color="amber"
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
        <Card variant="elevated">
          <LoadingSkeleton lines={4} message="Crafting your explanation..." variant="card" />
        </Card>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4 animate-fade-up">
          {/* Main explanation */}
          <Card accent="amber" variant="elevated">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="text-amber-400" size={18} />
                <span className="text-amber-400 text-xs font-mono uppercase tracking-widest">
                  Explanation
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
                  {level}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(fullText, setCopied)}
                  className="h-8 w-8 p-0"
                  aria-label={copied ? "Copied!" : "Copy explanation"}
                  color="amber"
                >
                  {copied ? <Check className="text-emerald-400" size={14} /> : <Copy className="text-slate-400" size={14} />}
                </Button>
              </div>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{result.explanation}</p>
          </Card>

          {/* Key Points */}
          {result.key_points?.length > 0 && (
            <Card accent="emerald" variant="elevated">
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
              <Card accent="violet" variant="elevated">
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
              <Card accent="sky" variant="elevated">
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

      <ToolHistory
        type="explain"
        activeId={activeHistoryId}
        onSelect={(item) => {
          // Saved generations already contain the structured result shape that
          // the page renders, so selecting history only needs to hydrate state.
          setTopic(item.topic);
          setResult(item.result);
          setActiveHistoryId(item.id);
        }}
        onDeleted={(id) => {
          // Clear the open explanation when the entry backing it is removed.
          if (activeHistoryId === id) {
            setResult(null);
            setActiveHistoryId(null);
          }
        }}
      />
    </div>
  );
}
