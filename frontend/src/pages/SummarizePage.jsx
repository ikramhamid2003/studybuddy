import { useState } from "react";
import toast from "react-hot-toast";
import { FileText, Tag, BookOpen, Lightbulb } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { Textarea } from "../components/Input";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { summarizeNotes } from "../utils/api";

export default function SummarizePage() {
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSummarize() {
    if (!notes.trim()) return toast.error("Please paste some notes first");
    if (notes.trim().length < 30) return toast.error("Notes too short — add more content");
    setLoading(true);
    setResult(null);
    try {
      const data = await summarizeNotes(notes.trim());
      setResult(data);
      toast.success("Summary ready!");
    } catch (err) {
      toast.error(err.message || "Failed to summarize.");
    } finally {
      setLoading(false);
    }
  }

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
        />
        <div className="flex items-center justify-between">
          <span className="text-slate-600 text-xs font-mono">
            {notes.length} characters
          </span>
          <Button
            onClick={handleSummarize}
            loading={loading}
            disabled={!notes.trim()}
          >
            <FileText size={16} />
            Summarize
          </Button>
        </div>
      </Card>

      {loading && (
        <Card>
          <LoadingSkeleton lines={5} message="Condensing your notes..." />
        </Card>
      )}

      {result && !loading && (
        <div className="space-y-4 animate-fade-up">
          {/* Summary */}
          <Card accent="emerald">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="text-emerald-400" size={18} />
              <span className="text-emerald-400 text-xs font-mono uppercase tracking-widest">
                Summary
              </span>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed">{result.summary}</p>
          </Card>

          {/* Key Concepts */}
          {result.key_concepts?.length > 0 && (
            <Card>
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
                    className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-300 hover:border-amber-400/40 hover:text-amber-300 transition-colors"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Important Terms */}
          {result.important_terms?.length > 0 && (
            <Card accent="violet">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-violet-400 text-xs font-mono uppercase tracking-widest">
                  📚 Important Terms
                </span>
              </div>
              <div className="divide-y divide-slate-800">
                {result.important_terms.map((t, i) => (
                  <div key={i} className="py-2.5 flex gap-4 items-start">
                    <span className="text-violet-300 font-mono text-xs font-semibold min-w-[130px] pt-0.5">
                      {t.term}
                    </span>
                    <span className="text-slate-400 text-sm">{t.definition}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Study Tips */}
          {result.study_tips?.length > 0 && (
            <Card accent="amber">
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
    </div>
  );
}
