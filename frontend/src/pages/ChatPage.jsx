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
  Copy,
  Check as CheckIcon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import Card from "../components/Card";
import LoadingSkeleton from "../components/LoadingSkeleton";
import {
  sendChatStream,
  listChatSessions,
  createChatSession,
  getChatSession,
  renameChatSession,
  deleteChatSession,
} from "../utils/api";

function MessageBubble({ msg, onCopy }) {
  const isUser = msg.role === "user";
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const utteranceRef = useRef(null);

  function toggleSpeech(text) {
    // Browser speech synthesis is global, so cancel existing speech before
    // starting a new assistant response.
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

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    if (onCopy) onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

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
      <div className={`flex flex-col gap-1 max-w-[78%] relative`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
            ${isUser
              ? "bg-gradient-to-r from-rose-500 to-rose-400 text-white font-medium rounded-tr-sm shadow-[0_4px_15px_rgba(244,63,94,0.12)]"
              : "backdrop-blur-md bg-slate-900/40 text-slate-200 border border-slate-800/80 rounded-tl-sm whitespace-pre-wrap"
            }`}
        >
          {msg.content}
        </div>
        {!isUser && msg.content && (
          <div className="flex items-center justify-start gap-1.5 ml-1 mt-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSpeech(msg.content)}
              className={`h-7 w-7 p-0 transition-colors ${isSpeaking ? 'text-rose-300 bg-rose-500/20 animate-pulse' : 'text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/15'}`}
              title={isSpeaking ? "Stop reading" : "Read aloud"}
              aria-label={isSpeaking ? "Stop reading" : "Read aloud"}
            >
              {isSpeaking ? <Square size={13} fill="currentColor" /> : <Volume2 size={14} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 w-7 p-0 text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/15 transition-colors"
              title={copied ? "Copied!" : "Copy message"}
              aria-label={copied ? "Copied!" : "Copy message"}
            >
              {copied ? <CheckIcon className="text-emerald-400" size={14} /> : <Copy size={14} />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  // Displayed only while the assistant stream has not produced its first token.
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-center flex-shrink-0">
        <Bot size={15} className="text-rose-400" />
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

const LAST_CHAT_SESSION_KEY = "studybuddy:lastChatSessionId";

function SessionRow({ session, active, onSelect, onRename, onDelete, collapsed }) {
  // Inline rename state stays local to each sidebar row.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.title);
  const [menuOpen, setMenuOpen] = useState(false);

  // `collapsed` only affects the desktop rail (the mobile drawer is always wide),
  // so text is hidden at `lg` rather than removed from the DOM.
  const hideWhenCollapsed = collapsed ? "lg:hidden" : "";

  function startEdit(e) {
    e.stopPropagation();
    setDraft(session.title);
    setEditing(true);
    setMenuOpen(false);
  }

  function commitEdit(e) {
    e?.stopPropagation();
    const trimmed = draft.trim();
    // Avoid a network call when the title is unchanged or blank.
    if (trimmed && trimmed !== session.title) {
      onRename(session.id, trimmed);
    }
    setEditing(false);
  }

  function cancelEdit(e) {
    e?.stopPropagation();
    setEditing(false);
  }

  function handleRename(e) {
    e.stopPropagation();
    setMenuOpen(false);
    startEdit(e);
  }

  function handleDelete(e) {
    e.stopPropagation();
    setMenuOpen(false);
    onDelete(session.id);
  }

  function handleSelectRow() {
    if (!editing) onSelect(session.id);
  }

  return (
    <div className="relative">
      <div
        onClick={handleSelectRow}
        className={`group flex items-center gap-2 py-2.5 rounded-xl cursor-pointer border transition-all duration-150
          ${collapsed ? "lg:justify-center lg:px-2" : "px-3"}
          ${
            active
              ? "bg-amber-500/20 border-amber-400/50 shadow-[0_0_18px_-6px_rgba(245,158,11,0.5)]"
              : "border-transparent hover:bg-amber-500/10 hover:border-amber-400/25"
          }`}
      >
        <MessageSquare
          size={14}
          className={`flex-shrink-0 transition-colors ${
            active ? "text-amber-300" : "text-slate-500 group-hover:text-amber-300"
          }`}
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
            className={`${hideWhenCollapsed} flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400`}
          />
        ) : (
          <span
            className={`${hideWhenCollapsed} flex-1 min-w-0 truncate text-xs transition-colors ${
              active
                ? "text-amber-200 font-semibold"
                : "text-slate-400 group-hover:text-slate-200"
            }`}
          >
            {session.title}
          </span>
        )}

        {/* Action menu button - always visible */}
        <div className={`relative ${hideWhenCollapsed}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="icon-button flex-shrink-0"
            title="More actions"
            aria-label="Session actions"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal size={14} />
          </button>

          {/* Actions menu */}
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="menu-panel absolute right-0 top-full mt-1 w-44 z-50 animate-fade-in">
                <div className="p-2 space-y-0.5">
                  {!editing && (
                    <>
                      <button
                        onClick={handleRename}
                        className="menu-item text-sky-300 hover:text-sky-100 hover:bg-sky-500/20"
                      >
                        <Pencil size={14} className="flex-shrink-0" />
                        Rename
                      </button>
                      <button
                        onClick={handleDelete}
                        className="menu-item menu-item--danger"
                      >
                        <Trash2 size={14} className="flex-shrink-0" />
                        Delete
                      </button>
                    </>
                  )}
                  {editing && (
                    <>
                      <button
                        onClick={commitEdit}
                        className="menu-item menu-item--confirm"
                      >
                        <Check size={14} className="flex-shrink-0" />
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="menu-item menu-item--quiet"
                      >
                        <X size={14} className="flex-shrink-0" />
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  // Sessions power the sidebar; messages power the currently opened transcript.
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const initialSessionOpenedRef = useRef(false);

  const refreshSessions = useCallback(async () => {
    try {
      // Re-fetch after sends/renames/deletes so ordering and auto titles stay
      // aligned with the backend.
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

  const openSession = useCallback(async (sessionId) => {
    if (sessionId === activeSessionId) return;
    try {
      // Opening a session hydrates the full transcript from persisted messages.
      const data = await getChatSession(sessionId);
      setActiveSessionId(sessionId);
      localStorage.setItem(LAST_CHAT_SESSION_KEY, String(sessionId));
      setMessages(
        data.messages.length
          ? data.messages.map((m) => ({ role: m.role, content: m.content }))
          : [WELCOME]
      );
    } catch (err) {
      toast.error("Couldn't open that chat");
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (sessionsLoading || initialSessionOpenedRef.current || sessions.length === 0) {
      return;
    }

    // On first load, restore the last selected chat when possible.
    initialSessionOpenedRef.current = true;
    const lastSessionId = Number(localStorage.getItem(LAST_CHAT_SESSION_KEY));
    const sessionToOpen =
      sessions.find((session) => session.id === lastSessionId) || sessions[0];
    openSession(sessionToOpen.id);
  }, [openSession, sessions, sessionsLoading]);

  function startNewChat() {
    // A new chat remains unsaved until the first user message creates a session.
    setActiveSessionId(null);
    localStorage.removeItem(LAST_CHAT_SESSION_KEY);
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
      // Update local sidebar state immediately, then let the next refresh keep
      // ordering consistent with the backend.
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (sessionId === activeSessionId) {
        startNewChat();
      } else if (String(sessionId) === localStorage.getItem(LAST_CHAT_SESSION_KEY)) {
        localStorage.removeItem(LAST_CHAT_SESSION_KEY);
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
        localStorage.setItem(LAST_CHAT_SESSION_KEY, String(sessionId));
      }

      // Build a system message with all session titles so the model can answer
      // questions like "what are my other chats?".
      const sessionList = sessions
        .filter((s) => s.id !== sessionId)
        .map((s) => `- "${s.title}" (id: ${s.id})`)
        .join("\n");
      const systemPrompt = `You are a helpful AI study assistant. The user has the following other chat sessions:\n${sessionList || "(none)"}\nYou can reference these by title if the user asks about their other chats.`;

      let isFirstChunk = true;

      await sendChatStream(
        userMsg,
        [{ role: "system", content: systemPrompt }],
        sessionId,
        (chunk) => {
          // The first chunk replaces the typing indicator with a real assistant
          // bubble; later chunks append into that same bubble.
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
          // Pick up the auto-generated title and updated sidebar ordering.
          refreshSessions();
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
    // Fills the leftover viewport height so the transcript scrolls internally
    // and the composer sits at the bottom instead of ending mid-screen.
    <div className="flex flex-1 flex-col min-h-0">
      <PageHeader
        icon="💬"
        title="Study Chat"
        subtitle="Ask anything — your AI tutor is ready to help"
      />

      <div
        className="flex gap-4 relative flex-1 min-h-[320px]"
      >
        {/* Mobile sidebar backdrop - clicking outside closes sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sessions sidebar - responsive: fixed on desktop, block/hidden on mobile */}
        <div
          role="complementary"
          aria-label="Chat sessions"
          className={`
            fixed top-0 left-0 h-full z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col
            lg:relative lg:z-auto ${sidebarCollapsed ? "lg:w-20" : "lg:w-56"} lg:rounded-2xl lg:border lg:border-slate-800 lg:bg-slate-900 lg:shadow-card
            lg:flex lg:hover:bg-slate-800/50
            ${sidebarOpen ? "block" : "hidden"}
            transition-[width] duration-200
          `}
        >
          {/* Mobile close header visible only on mobile */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between lg:hidden">
            <span className="text-white text-sm font-semibold">Chats</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="icon-button"
              aria-label="Close sidebar"
            >
              <X size={16} />
            </button>
          </div>

          <div className={sidebarCollapsed ? "p-3 border-b border-slate-800 lg:px-2" : "p-3 border-b border-slate-800"}>
            <Button
              variant="secondary"
              size="sm"
              onClick={startNewChat}
              className="w-full justify-center"
              aria-label="New Chat"
              title="New Chat"
            >
              <Plus size={14} />
              <span className={sidebarCollapsed ? "lg:hidden" : ""}>New Chat</span>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessionsLoading ? (
              <div className="text-center py-4">
                <LoadingSkeleton
                  lines={2}
                  message={sidebarCollapsed ? "" : "Loading chats..."}
                  variant="inline"
                />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 px-2">
                <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center mx-auto mb-2 border border-slate-800">
                  <MessageSquare className="text-slate-500" size={20} />
                </div>
                <p className={`${sidebarCollapsed ? "lg:hidden" : ""} text-slate-500 text-xs font-mono mb-1`}>
                  No chats yet
                </p>
                <p className={`${sidebarCollapsed ? "lg:hidden" : ""} text-slate-600 text-[10px] font-light max-w-xs mx-auto`}>
                  Send a message to start your first conversation.
                </p>
              </div>
            ) : (
              sessions.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  active={s.id === activeSessionId}
                  collapsed={sidebarCollapsed}
                  onSelect={(id) => { openSession(id); setSidebarOpen(false); }}
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
              {/* Mobile sidebar toggle */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="icon-button lg:hidden -ml-1"
                aria-label="Open sessions"
              >
                <MessageSquare size={16} />
              </button>
              {/* Desktop collapse toggle for the sessions rail */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="icon-button hidden lg:inline-flex -ml-1"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!sidebarCollapsed}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" />
              <span className="text-slate-500 text-xs font-mono">AI Online</span>
              {activeSessionId && (
                <span className="text-slate-600 text-[10px] font-mono px-2 py-0.5 bg-slate-800/50 rounded">
                  #{activeSessionId}
                </span>
              )}
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
              <Card variant="outlined" className="animate-fade-up">
                <p className="text-slate-500 text-xs font-mono mb-2">Try asking:</p>
                <div className="grid grid-cols-2 gap-2">
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
              </Card>
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
            <p className="text-slate-700 text-xs mt-1.5 ml-1">Press Enter to send • Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  );
}
