import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Send,
  Trash2,
  Bot,
  User,
  Volume2,
  Square,
  Plus,
  MessageSquare,
  Pencil,
  Check,
  X,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import {
  sendChatStream,
  listChatSessions,
  createChatSession,
  getChatSession,
  renameChatSession,
  deleteChatSession,
} from "../utils/api";

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  function toggleSpeech(text) {
    if (!("speechSynthesis" in window)) {
      return toast.error("Text-to-speech is not supported in this browser.");
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance; // Prevent garbage collection bug

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-fade-up`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm border
          ${isUser ? "bg-rose-500 border-rose-400/20" : "bg-slate-900/60 border-slate-800/80"}`}
      >
        {isUser
          ? <User size={15} className="text-white" />
          : <Bot size={15} className="text-rose-400" />}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-1 max-w-[78%]`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
            ${isUser
              ? "bg-gradient-to-r from-rose-500 to-rose-450 text-white font-medium rounded-tr-sm shadow-[0_4px_15px_rgba(244,63,94,0.12)]"
              : "backdrop-blur-md bg-slate-900/40 text-slate-200 border border-slate-800/80 rounded-tl-sm whitespace-pre-wrap"
            }`}
        >
          {msg.content}
        </div>
        {!isUser && msg.content && (
          <div className="flex justify-start ml-1 mt-0.5">
             <button onClick={() => toggleSpeech(msg.content)} className={`transition-colors ${isSpeaking ? 'text-rose-400 animate-pulse' : 'text-slate-500 hover:text-rose-400'}`} title={isSpeaking ? "Stop reading" : "Read aloud"}>
               {isSpeaking ? <Square size={13} fill="currentColor" /> : <Volume2 size={14} />}
             </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-center flex-shrink-0">
        <Bot size={15} className="text-rose-455" />
      </div>
      <div className="backdrop-blur-md bg-slate-900/40 border border-slate-800/80 rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5 shadow-sm">
        <span className="typing-dot w-2 h-2 rounded-full bg-rose-400" />
        <span className="typing-dot w-2 h-2 rounded-full bg-rose-400" />
        <span className="typing-dot w-2 h-2 rounded-full bg-rose-400" />
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

function SessionRow({ session, active, onSelect, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.title);

  function startEdit(e) {
    e.stopPropagation();
    setDraft(session.title);
    setEditing(true);
  }

  function commitEdit(e) {
    e?.stopPropagation();
    const trimmed = draft.trim();
    if (trimmed && trimmed !== session.title) {
      onRename(session.id, trimmed);
    }
    setEditing(false);
  }

  function cancelEdit(e) {
    e?.stopPropagation();
    setEditing(false);
  }

  return (
    <div
      onClick={() => !editing && onSelect(session.id)}
      className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors
        ${active ? "bg-amber-400/10 border border-amber-400/30" : "hover:bg-slate-800/60 border border-transparent"}`}
    >
      <MessageSquare
        size={14}
        className={`flex-shrink-0 ${active ? "text-amber-400" : "text-slate-500"}`}
      />

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit(e);
            if (e.key === "Escape") cancelEdit(e);
          }}
          className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
        />
      ) : (
        <span
          className={`flex-1 min-w-0 truncate text-xs ${active ? "text-amber-300 font-medium" : "text-slate-400"}`}
        >
          {session.title}
        </span>
      )}

      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {editing ? (
          <>
            <button onClick={commitEdit} className="text-emerald-400 hover:text-emerald-300" title="Save">
              <Check size={13} />
            </button>
            <button onClick={cancelEdit} className="text-slate-500 hover:text-slate-300" title="Cancel">
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <button onClick={startEdit} className="text-slate-500 hover:text-slate-300" title="Rename">
              <Pencil size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session.id);
              }}
              className="text-slate-500 hover:text-rose-400"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const refreshSessions = useCallback(async () => {
    try {
      const data = await listChatSessions();
      setSessions(data);
    } catch (err) {
      toast.error("Couldn't load your chats");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function openSession(sessionId) {
    if (sessionId === activeSessionId) return;
    try {
      const data = await getChatSession(sessionId);
      setActiveSessionId(sessionId);
      setMessages(
        data.messages.length
          ? data.messages.map((m) => ({ role: m.role, content: m.content }))
          : [WELCOME]
      );
    } catch (err) {
      toast.error("Couldn't open that chat");
    }
  }

  function startNewChat() {
    setActiveSessionId(null);
    setMessages([WELCOME]);
    setInput("");
    inputRef.current?.focus();
  }

  async function handleRename(sessionId, title) {
    try {
      await renameChatSession(sessionId, title);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
      );
    } catch (err) {
      toast.error("Couldn't rename chat");
    }
  }

  async function handleDelete(sessionId) {
    if (!window.confirm("Delete this chat? This can't be undone.")) return;
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (sessionId === activeSessionId) {
        startNewChat();
      }
      toast.success("Chat deleted");
    } catch (err) {
      toast.error("Couldn't delete chat");
    }
  }

  async function handleSend(text) {
    const userMsg = (text || input).trim();
    if (!userMsg || loading) return;
    setInput("");

    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      // Lazily create a session on the first real message of a new chat.
      let sessionId = activeSessionId;
      if (sessionId === null) {
        const created = await createChatSession();
        sessionId = created.id;
        setActiveSessionId(sessionId);
      }

      let isFirstChunk = true;

      await sendChatStream(
        userMsg,
        [], // history is authoritative server-side once a session exists
        sessionId,
        (chunk) => {
          if (isFirstChunk) {
            isFirstChunk = false;
            setLoading(false);
            setMessages((m) => [...m, { role: "assistant", content: chunk }]);
          } else {
            setMessages((m) => {
              const next = [...m];
              const last = next[next.length - 1];
              if (last && last.role === "assistant") {
                last.content += chunk;
              }
              return next;
            });
          }
        },
        () => {
          setLoading(false);
          inputRef.current?.focus();
          refreshSessions(); // pick up the auto-generated title / updated_at ordering
        },
        (err) => {
          toast.error(err.message || "Failed to send message");
          setLoading(false);
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content: "Connection error. Make sure your Django backend is running.",
            },
          ]);
          inputRef.current?.focus();
        }
      );
    } catch (err) {
      toast.error(err.message || "Failed to initiate stream");
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div>
      <PageHeader
        icon="💬"
        title="Study Chat"
        subtitle="Ask anything — your AI tutor is ready to help"
      />

      <div
        className="flex gap-4"
        style={{ height: "calc(100vh - 280px)", minHeight: 400 }}
      >
        {/* Sessions sidebar */}
        <div className="w-56 flex-shrink-0 bg-slate-900 border border-slate-800 rounded-2xl shadow-card flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-800">
            <Button variant="secondary" size="sm" onClick={startNewChat} className="w-full justify-center">
              <Plus size={14} />
              New Chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessionsLoading ? (
              <p className="text-slate-600 text-xs px-2 py-2 font-mono">Loading…</p>
            ) : sessions.length === 0 ? (
              <p className="text-slate-600 text-xs px-2 py-2">No chats yet — send a message to start one.</p>
            ) : (
              sessions.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  active={s.id === activeSessionId}
                  onSelect={openSession}
                  onRename={handleRename}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-card">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" />
              <span className="text-slate-500 text-xs font-mono">AI Online</span>
            </div>
            <Button variant="ghost" size="sm" onClick={startNewChat}>
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
                onChange={(e) => setInput(e.target.value.slice(0, 2000))}
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
    </div>
  );
}
