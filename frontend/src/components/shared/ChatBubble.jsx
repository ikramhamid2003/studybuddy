import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { Volume2, Square, Copy, Check } from "lucide-react";
import PropTypes from "prop-types";

export default function ChatBubble({ msg }) {
  const isUser = msg.role === "user";
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const utteranceRef = useRef(null);

  function toggleSpeech(text) {
    if (!("speechSynthesis" in window)) {
      return toast.error("Text-to-speech is not supported in this browser.");
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
                ? "bg-gradient-to-r from-rose-500 to-rose-450 text-white font-medium rounded-tr-sm shadow-[0_4px_15px_rgba(244,63,94,0.12)]"
                : "backdrop-blur-md bg-slate-900/40 text-slate-200 border border-slate-800/80 rounded-tl-sm whitespace-pre-wrap"
            }`}
        >
          {msg.content}
        </div>
        {!isUser && msg.content && (
          <div className="flex items-center justify-start gap-1.5 ml-1 mt-0.5">
            <button
              onClick={() => toggleSpeech(msg.content)}
              className={`h-7 w-7 p-0 flex items-center justify-center rounded-lg transition-colors ${isSpeaking ? "text-rose-400 animate-pulse" : "text-slate-500 hover:text-rose-400 hover:bg-slate-800/50"}`}
              title={isSpeaking ? "Stop reading" : "Read aloud"}
              aria-label={isSpeaking ? "Stop reading" : "Read aloud"}
            >
              {isSpeaking ? <Square size={13} fill="currentColor" /> : <Volume2 size={14} />}
            </button>
            <button
              onClick={handleCopy}
              className="h-7 w-7 p-0 flex items-center justify-center rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800/50 transition-colors"
              title={copied ? "Copied!" : "Copy message"}
              aria-label={copied ? "Copied!" : "Copy message"}
            >
              {copied ? <Check className="text-emerald-400" size={14} /> : <Copy size={14} />}
            </button>
          </div>
        )}
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
