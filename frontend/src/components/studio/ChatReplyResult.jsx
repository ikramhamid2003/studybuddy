import Card from "../Card";
import SectionTitle from "../shared/SectionTitle";

export default function ChatReplyResult({ result }) {
  return (
    <Card accent="rose" variant="elevated">
      <div className="flex items-center gap-2 mb-3">
        <SectionTitle color="text-rose-400">Reply</SectionTitle>
      </div>
      <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{result.reply}</p>
    </Card>
  );
}
