import { Bot } from "lucide-react";

export default function TypingIndicator() {
  // Displayed only while the assistant stream has not produced its first token.
  return (
    <div role="status" className="flex gap-3 animate-fade-in">
      <span className="sr-only">Assistant is typing</span>
      <div aria-hidden="true" className="w-8 h-8 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-center flex-shrink-0">
        <Bot size={15} className="text-rose-400" />
      </div>
      <div aria-hidden="true" className="backdrop-blur-md bg-slate-900/40 border border-slate-800/80 rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5 shadow-sm">
        <span className="typing-dot w-2 h-2 rounded-full bg-rose-400" />
        <span className="typing-dot w-2 h-2 rounded-full bg-rose-400" />
        <span className="typing-dot w-2 h-2 rounded-full bg-rose-400" />
      </div>
    </div>
  );
}
