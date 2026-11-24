import { Copy } from "lucide-react";
import Card from "../Card";
import Button from "../Button";
import SectionTitle from "../shared/SectionTitle";

export default function ExplainResult({ result }) {
  return (
    <div className="space-y-4">
      <Card accent="amber" variant="elevated">
        <div className="flex items-center justify-between mb-3">
          <SectionTitle color="text-amber-600">Explanation</SectionTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigator.clipboard.writeText([
              result.explanation,
              result.key_points?.length ? `\n\nKey Points:\n${result.key_points.map(p => `• ${p}`).join("\n")}` : "",
              result.analogy ? `\n\nAnalogy:\n${result.analogy}` : "",
              result.example ? `\n\nExample:\n${result.example}` : "",
            ].filter(Boolean).join(""))}
            className="h-7 w-7 p-0"
            aria-label="Copy explanation"
          >
            <Copy size={14} className="text-slate-500" />
          </Button>
        </div>
        <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{result.explanation}</p>
      </Card>
      {result.key_points?.length > 0 && (
        <Card accent="emerald" variant="elevated">
          <SectionTitle color="text-emerald-600">Key Points</SectionTitle>
          <ul className="space-y-2">
            {result.key_points.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="text-emerald-600 font-bold mt-0.5 flex-shrink-0">→</span>
                {point}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        {result.analogy && (
          <Card accent="violet" variant="elevated">
            <SectionTitle color="text-violet-600">Analogy</SectionTitle>
            <p className="text-slate-700 text-sm leading-relaxed italic">{result.analogy}</p>
          </Card>
        )}
        {result.example && (
          <Card accent="sky" variant="elevated">
            <SectionTitle color="text-sky-700">Example</SectionTitle>
            <p className="text-slate-700 text-sm leading-relaxed">{result.example}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
