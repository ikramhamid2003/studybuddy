import { useState } from "react";
import {
  Send,
  Trash2,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import Card from "../components/Card";
import DocumentPicker from "../components/shared/DocumentPicker";
import GroundingNote from "../components/shared/GroundingNote";
import MessageBubble from "../components/chat/MessageBubble";
import TypingIndicator from "../components/chat/TypingIndicator";
import FollowUpChips from "../components/chat/FollowUpChips";
import SessionSidebar from "../components/chat/SessionSidebar";
import { SUGGESTIONS } from "../components/chat/chatConstants";
import { useLibrary } from "../context/DocumentLibraryContext";
import useChat from "../hooks/useChat";
import useAutoScroll from "../hooks/useAutoScroll";

export default function ChatPage() {
  const library = useLibrary();
  const {
    sessions,
    sessionsLoading,
    activeSessionId,
    messages,
    input,
    setInput,
    loading,
    bottomRef,
    inputRef,
    openSession,
    startNewChat,
    handleRename,
    handleDelete,
    handleSend,
  } = useChat(library);
  // Presentation-only state: whether the mobile drawer is open and whether the
  // desktop rail is collapsed.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Follow the conversation only while the reader is at the bottom; see the hook.
  const { scrollRef, onScroll } = useAutoScroll({
    bottomRef,
    changeKey: `${messages.length}:${messages.at(-1)?.content?.length ?? 0}:${loading}`,
    lastIsUser: messages.at(-1)?.role === "user",
  });

  return (
    // Fills the leftover viewport height so the transcript scrolls internally
    // and the composer sits at the bottom instead of ending mid-screen.
    <div className="flex flex-1 flex-col min-h-0">
      <PageHeader
        icon="💬"
        title="Study Chat"
        subtitle="Ask anything — your AI tutor is ready to help"
      />

      {/* Grounding: the same document library every tool page uses */}
      <div className="shrink-0">
        <DocumentPicker library={library} title="Chat with my documents" />
      </div>

      {/* One surface holds both columns: the session rail and the transcript
          are regions of a single card divided by a border, rather than two
          floating panels with a gap between them. */}
      <div className="flex relative flex-1 min-h-[320px] rounded-2xl border border-slate-800 bg-slate-900 shadow-card overflow-hidden">
        <SessionSidebar
          sessions={sessions}
          sessionsLoading={sessionsLoading}
          activeSessionId={activeSessionId}
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onNewChat={startNewChat}
          onSelect={openSession}
          onRename={handleRename}
          onDelete={handleDelete}
        />

        {/* Transcript region of the same surface: its chrome now comes from the
            shared card, so it carries no border, radius or shadow of its own. */}
        <div className="flex-1 min-w-0 flex flex-col">
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
              <span className="text-slate-400 text-xs font-mono">AI Online</span>
              {activeSessionId && (
                <span className="text-slate-400 text-[10px] font-mono px-2 py-0.5 bg-slate-800/50 rounded">
                  #{activeSessionId}
                </span>
              )}
            </div>
            <Button variant="ghost" surface="dark" size="sm" onClick={startNewChat}>
              <Trash2 size={13} />
              Clear
            </Button>
          </div>

          {/* Messages: a log region, so assistant replies are announced as they
              arrive; aria-busy holds announcements back while one is streaming. */}
          <div
            ref={scrollRef}
            onScroll={onScroll}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={loading}
            aria-label="Conversation"
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
          >
            {/* Quick suggestions on first load */}
            {messages.length === 1 && (
              <Card variant="outlined" className="animate-fade-up">
                <p className="text-slate-400 text-xs font-mono mb-2">Try asking:</p>
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
            {/* Offer follow-ups after the latest assistant reply, once we have a
                real session to ground them on and no reply is still streaming. */}
            {!loading &&
              activeSessionId &&
              messages[messages.length - 1]?.role === "assistant" && (
                <FollowUpChips
                  key={`${activeSessionId}-${messages.length}`}
                  sessionId={activeSessionId}
                  onPick={(s) => handleSend(s)}
                />
              )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="border-t border-slate-800 px-4 py-3">
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                aria-label="Message"
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
                aria-label="Send message"
              >
                <Send size={15} />
              </Button>
            </div>
            <p className="text-slate-400 text-xs mt-1.5 ml-1">Press Enter to send</p>
          </div>
        </div>
      </div>

      <GroundingNote />
    </div>
  );
}
