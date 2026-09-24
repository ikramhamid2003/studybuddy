import PropTypes from "prop-types";

export default function ChatBubble({ msg }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-fade-up`}>
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm border
          ${isUser ? "bg-rose-500 border-rose-400/20" : "bg-slate-900/60 border-slate-800/80"}`}
      >
        {isUser ? (
          <span className="text-white text-xs font-bold">U</span>
        ) : (
          <span className="text-rose-400 text-xs font-bold">AI</span>
        )}
      </div>
      <div className="flex flex-col gap-1 max-w-[78%] relative">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
            ${
              isUser
                ? "bg-gradient-to-r from-rose-500 to-rose-400 text-white font-medium rounded-tr-sm shadow-[0_4px_15px_rgba(244,63,94,0.12)]"
                : "backdrop-blur-md bg-slate-900/40 text-slate-200 border border-slate-800/80 rounded-tl-sm whitespace-pre-wrap"
            }`}
        >
          {msg.content}
        </div>
      </div>
    </div>
  );
}

ChatBubble.propTypes = {
  msg: PropTypes.shape({
    role: PropTypes.oneOf(["user", "assistant"]).isRequired,
    content: PropTypes.string.isRequired,
  }).isRequired,
};
