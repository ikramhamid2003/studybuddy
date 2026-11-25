import { MessageSquare, Send, Plus, Trash2 } from "lucide-react";
import Card from "../Card";
import Button from "../Button";
import ChatBubble from "../shared/ChatBubble";
import { Input } from "../Input";
import TypingIndicator from "../chat/TypingIndicator";

export default function ChatPanel({
  sessions,
  activeSessionId,
  turns,
  started,
  input,
  setInput,
  loading,
  bottomRef,
  onNewChat,
  onOpenSession,
  onDeleteSession,
  onSend,
}) {
  return (
    <div className="mb-6 space-y-4">
      {/* Chat sessions list */}
      <Card variant="elevated">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-slate-400" />
            <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">Chat Sessions</span>
          </div>
          <Button variant="secondary" size="sm" onClick={onNewChat} color="rose">
            <Plus size={14} />
            New Chat
          </Button>
        </div>
        {sessions.length === 0 ? (
          <p className="text-slate-400 text-xs">No saved chats yet. Start a conversation above.</p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onOpenSession(session.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  activeSessionId === session.id
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
                }`}
              >
                <MessageSquare size={12} className="flex-shrink-0" />
                <span className="text-sm truncate flex-1">{session.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="icon-button icon-button--danger -mr-1 flex-shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Chat panel - only show when chat has started */}
      {started && (
        <Card variant="elevated">
          <div className="h-[420px] flex flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {turns.map((m, i) => (
                <ChatBubble key={i} msg={m} />
              ))}
              {loading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-slate-800 px-4 py-3">
              <div className="flex gap-2 items-center">
                <Input
                  type="text"
                  aria-label="Chat message"
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, 2000))}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
                  placeholder="Ask a question, request an explanation..."
                  className="flex-1"
                  leftIcon={<MessageSquare className="w-4 h-4" />}
                  disabled={loading}
                />
                <Button onClick={onSend} loading={loading} disabled={!input.trim()} size="md" color="rose">
                  <Send size={15} />
                </Button>
              </div>
              <p className="text-slate-400 text-xs mt-1.5 ml-1">Press Enter to send • Shift+Enter for new line</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
