import { useState } from "react";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Tag, BookOpen, Lightbulb, Copy, Check, ArrowRight } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { Textarea, Select } from "../components/Input";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ToolHistory from "../components/ToolHistory";
import { generateAll } from "../utils/api";
import { copyToClipboard } from "../utils/clipboard";

export default function SummarizePage() {
  const queryClient = useQueryClient();
  // The textarea content is sent as the "topic" field to the shared generation
  // endpoint, then persisted as the saved-history label.
  const [notes, setNotes] = useState("");
  const [format, setFormat] = useState("bullets");
  const [result, setResult] = useState(null);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [copied, setCopied] = useState(false);
  const { mutate, isPending: loading } = useMutation({
    mutationFn: () => generateAll(notes.trim(), "summarize", { format }),
    onSuccess: (data) => {
      // Refresh this tool's history cache after a successful saved generation.
      setResult(data);
      setActiveHistoryId(data.generation_id ?? null);
      queryClient.invalidateQueries({ queryKey: ["generations", "summarize"] });
      toast.success("Summary ready!");
    },
    onError: (err) => toast.error(err.message || "Failed to summarize.")
  });

  function handleSummarize() {
    if (!notes.trim()) return toast.error("Please paste some notes first");
    if (notes.trim().length < 30) return toast.error("Notes too short — add more content");
    mutate();
  }

  const fullText = result
    ? [
        result.summary,
        result.key_concepts?.length ? `\n\nKey Concepts:\n${result.key_concepts.map(c => `• ${c}`).join("\n")}` : "",
        result.important_terms?.length ? `\n\nImportant Terms:\n${result.important_terms.map(t => `${t.term}: ${t.definition}`).join("\n")}` : "",
        result.study_tips?.length ? `\n\nStudy Tips:\n${result.study_tips.map(t => `• ${t}`).join("\n")}` : "",
      ].filter(Boolean).join("")
    : "";

  return (
    <div>
      <PageHeader
        icon="📝"
        title="Summarize Notes"
        subtitle="Paste any study material — get a smart, structured summary instantly"
      />

      <Card className="mb-6">
        <Textarea
          label="Your Study Notes"
          placeholder="Paste your notes, textbook excerpt, lecture content, or any study material here..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mb-4"
          style={{ minHeight: 200 }}
          hint={`${notes.length} characters${notes.length < 30 && notes.length > 0 ? " — need at least 30" : ""}`}
          error={notes.length > 0 && notes.length < 30 ? "Notes too short — add more content" : undefined}
        />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Select
              label="Format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-auto"
            >
              <option value="bullets">Bullets</option>
              <option value="paragraph">Paragraph</option>
              <option value="outline">Outline</option>
            </Select>
          </div>
          <Button
            onClick={handleSummarize}
            loading={loading}
            disabled={!notes.trim() || notes.trim().length < 30}
          >
            <ArrowRight size={16} />
            Summarize
          </Button>
        </div>
      </Card>

      {loading && (
        <Card variant="elevated">
          <LoadingSkeleton lines={5} message="Condensing your notes..." variant="card" />
        </Card>
      )}

      {result && !loading && (
        <div className="space-y-4 animate-fade-up">
          {/* Summary */}
          <Card accent="emerald" variant="elevated">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="text-emerald-400" size={18} />
                <span className="text-emerald-400 text-xs font-mono uppercase tracking-widest">
                  Summary
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(fullText, setCopied)}
                className="h-8 w-8 p-0"
                aria-label={copied ? "Copied!" : "Copy summary"}
              >
                {copied ? <Check className="text-emerald-400" size={14} /> : <Copy className="text-slate-400" size={14} />}
              </Button>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{result.summary}</p>
          </Card>

          {/* Key Concepts */}
          {result.key_concepts?.length > 0 && (
            <Card accent="amber" variant="elevated">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="text-amber-400" size={18} />
                <span className="text-amber-400 text-xs font-mono uppercase tracking-widest">
                  Key Concepts
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.key_concepts.map((c, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-300 hover:border-amber-400/40 hover:text-amber-300 transition-colors cursor-default"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Important Terms */}
          {result.important_terms?.length > 0 && (
            <Card accent="violet" variant="elevated">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-violet-400 text-xs font-mono uppercase tracking-widest">
                  📚 Important Terms
                </span>
              </div>
              <div className="divide-y divide-slate-800">
                {result.important_terms.map((t, i) => (
                  <div key={i} className="py-3 flex gap-4 items-start">
                    <span className="text-violet-300 font-mono text-xs font-semibold min-w-[130px] pt-0.5">
                      {t.term}
                    </span>
                    <span className="text-slate-300 text-sm">{t.definition}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Study Tips */}
          {result.study_tips?.length > 0 && (
            <Card accent="amber" variant="elevated">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="text-amber-400" size={18} />
                <span className="text-amber-400 text-xs font-mono uppercase tracking-widest">
                  Study Tips
                </span>
              </div>
              <ul className="space-y-2">
                {result.study_tips.map((t, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="text-amber-400 font-bold flex-shrink-0 mt-0.5">✦</span>
                    {t}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <ToolHistory
        type="summarize"
        activeId={activeHistoryId}
        onSelect={(item) => {
          // Reopen the exact saved summary without making another AI request.
          setNotes(item.topic);
          setResult(item.result);
          setActiveHistoryId(item.id);
        }}
      />
    </div>
  );
}
