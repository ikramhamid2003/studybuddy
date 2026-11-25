import { User, Bot } from "lucide-react";
import DocumentSources from "../shared/DocumentSources";

function URLBadge({ hasUrl }) {
  return (
    <span
      role="img"
      aria-label="Content from website"
      className="absolute -top-1 -right-1 rounded-full bg-amber-500/90 text-xs text-amber-300 border border-slate-950/50 p-0.5 shadow-sm"
      title="Content from website"
    >
      🌐
    </span>
  );
}

export default function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const hasUrl = msg.role === "assistant" && typeof msg.content === "object" && msg.content.hasUrl;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-fade-up`}>
      {/* Avatar: decorative, the speaker is announced by the hidden label below */}
      <div
        aria-hidden="true"
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm border
          ${isUser ? "bg-rose-500 border-rose-400/20" : "bg-slate-900/60 border-slate-800/80"}`}
      >
        {isUser
          ? <User size={15} className="text-white" />
          : <Bot size={15} className="text-rose-400" />}
      </div>

      {/* Bubble */}
      <div className="flex flex-col gap-1 max-w-[78%] relative">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
            ${isUser
              ? "bg-gradient-to-r from-rose-500 to-rose-400 text-white font-medium rounded-tr-sm shadow-[0_4px_15px_rgba(244,63,94,0.12)]"
              : "backdrop-blur-md bg-slate-900/40 text-slate-200 border border-slate-800/80 rounded-tl-sm whitespace-pre-wrap"
            }`}
        >
          <span className="sr-only">{isUser ? "You said: " : "Assistant said: "}</span>
          {hasUrl ? (
            <>
              {msg.content.content || msg.content || ""}
              <URLBadge hasUrl={hasUrl} />
            </>
          ) : (
            msg.content
          )}
        </div>
        {!isUser && msg.sources?.length > 0 && (
          <DocumentSources sources={msg.sources} className="mt-1" />
        )}
      </div>
    </div>
  );
}
