import { Copy } from "lucide-react";
import Card from "../Card";
import Button from "../Button";
import SectionTitle from "../shared/SectionTitle";

export default function SummarizeResult({ result }) {
  return (
    <div className="space-y-4">
      <Card accent="emerald" variant="elevated">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle color="text-emerald-600">Summary</SectionTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigator.clipboard.writeText([
              result.summary,
              result.key_concepts?.length ? `\n\nKey Concepts:\n${result.key_concepts.map(c => `• ${c}`).join("\n")}` : "",
              result.important_terms?.length ? `\n\nImportant Terms:\n${result.important_terms.map(t => `${t.term}: ${t.definition}`).join("\n")}` : "",
              result.study_tips?.length ? `\n\nStudy Tips:\n${result.study_tips.map(t => `• ${t}`).join("\n")}` : "",
            ].filter(Boolean).join(""))}
            className="h-7 w-7 p-0"
            aria-label="Copy summary"
          >
            <Copy size={14} className="text-slate-500" />
          </Button>
        </div>
        <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{result.summary}</p>
      </Card>
      {result.key_concepts?.length > 0 && (
        <Card accent="amber" variant="elevated">
          <SectionTitle color="text-amber-600">Key Concepts</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {result.key_concepts.map((concept, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-amber-100 border border-amber-200 rounded-full text-xs text-amber-900 font-medium hover:bg-amber-200 transition-colors cursor-default"
              >
                {concept}
              </span>
            ))}
          </div>
        </Card>
      )}
      {result.important_terms?.length > 0 && (
        <Card accent="violet" variant="elevated">
          <SectionTitle color="text-violet-600">Important Terms</SectionTitle>
          <div className="divide-y divide-slate-200">
            {result.important_terms.map((term, i) => (
              <li key={i} className="py-3 flex gap-4 items-start">
                <span className="text-violet-800 font-mono text-xs font-semibold min-w-[130px] pt-0.5">
                  {term.term}
                </span>
                <span className="text-slate-700 text-sm">{term.definition}</span>
              </li>
            ))}
          </div>
        </Card>
      )}
      {result.study_tips?.length > 0 && (
        <Card accent="amber" variant="elevated">
          <SectionTitle color="text-amber-600">Study Tips</SectionTitle>
          <ul className="space-y-2">
            {result.study_tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="text-amber-600 font-bold flex-shrink-0 mt-0.5">✦</span>
                {tip}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
