import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { Send, Trash2, Bot, User } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import { sendChat } from "../utils/api";

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-fade-up`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
          ${isUser ? "bg-amber-400" : "bg-slate-700"}`}
      >
        {isUser
          ? <User size={15} className="text-slate-900" />
          : <Bot size={15} className="text-amber-400" />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? "bg-amber-400 text-slate-900 font-medium rounded-tr-sm"
            : "bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm whitespace-pre-wrap"
          }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
        <Bot size={15} className="text-amber-400" />
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5">
        <span className="typing-dot w-2 h-2 rounded-full bg-amber-400" />
        <span className="typing-dot w-2 h-2 rounded-full bg-amber-400" />
        <span className="typing-dot w-2 h-2 rounded-full bg-amber-400" />
      </div>
    </div>
  );
}

const WELCOME = {
  role: "assistant",
  content:
    "Hey! I'm your AI Study Buddy 👋\n\nAsk me anything — explain a concept, work through a problem, quiz me, or just talk through what you're studying. I'm here to help!",
};

const SUGGESTIONS = [
  "Explain Newton's laws simply",
  "What is the difference between mitosis and meiosis?",
  "How does compound interest work?",
  "Summarize the causes of WW1",
];

export default function ChatPage() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(text) {
    const userMsg = (text || input).trim();
    if (!userMsg || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const history = messages
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));
      const data = await sendChat(userMsg, history);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply || "Sorry, no response." },
      ]);
    } catch (err) {
      toast.error(err.message || "Failed to send message");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Connection error. Make sure your Django backend is running at localhost:8000.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function clearChat() {
    setMessages([WELCOME]);
    toast.success("Chat cleared");
  }

  return (
    <div>
      <PageHeader
        icon="💬"
        title="Study Chat"
        subtitle="Ask anything — your AI tutor is ready to help"
      />

      {/* Chat window */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-card"
        style={{ height: "calc(100vh - 280px)", minHeight: 400 }}>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" />
            <span className="text-slate-500 text-xs font-mono">AI Online</span>
          </div>
          <Button variant="ghost" size="sm" onClick={clearChat}>
            <Trash2 size={13} />
            Clear
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Quick suggestions on first load */}
          {messages.length === 1 && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left px-3 py-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/40 rounded-xl text-xs text-slate-400 hover:text-amber-300 transition-all duration-150"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) => (
            <MessageBubble key={i} msg={m} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-slate-800 px-4 py-3">
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ask a question, request an explanation, work through a problem..."
              className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-colors"
            />
            <Button
              onClick={() => handleSend()}
              loading={loading}
              disabled={!input.trim()}
              size="md"
            >
              <Send size={15} />
            </Button>
          </div>
          <p className="text-slate-700 text-xs mt-1.5 ml-1">Press Enter to send</p>
        </div>
      </div>
    </div>
  );
}
