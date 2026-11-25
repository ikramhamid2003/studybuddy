import { useEffect, useRef } from "react";
import { Plus, MessageSquare, X } from "lucide-react";
import Button from "../Button";
import LoadingSkeleton from "../LoadingSkeleton";
import SessionRow from "./SessionRow";

/** The sessions rail: a drawer on mobile, a collapsible column on desktop. */
// Mobile drawer behaviour: Escape closes it, focus moves in when it opens and
// returns to whatever opened it when it closes. (On desktop the rail is always
// visible and `open` stays false, so none of this runs.)
function useDrawerFocus(open, onClose, closeRef) {
  // The page passes a fresh onClose every render; reading it through a ref keeps
  // the effect (and its focus handling) tied to `open` alone.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [open, closeRef]);
}

export default function SessionSidebar({
  sessions,
  sessionsLoading,
  activeSessionId,
  open,
  collapsed,
  onClose,
  onNewChat,
  onSelect,
  onRename,
  onDelete,
}) {
  const closeRef = useRef(null);
  useDrawerFocus(open, onClose, closeRef);

  return (
    <>
      {/* Mobile backdrop: clicking outside closes the drawer. */}
      {open && (
        <div
          data-testid="sidebar-backdrop"
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        role="complementary"
        aria-label="Chat sessions"
        className={`
          fixed top-0 left-0 h-full z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col
          lg:relative lg:z-auto ${collapsed ? "lg:w-20" : "lg:w-56"}
          lg:flex lg:border-slate-700/70
          ${open ? "block" : "hidden"}
          transition-[width] duration-200
        `}
      >
        {/* Mobile close header visible only on mobile */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between lg:hidden">
          <span className="text-white text-sm font-semibold">Chats</span>
          <button
            ref={closeRef}
            onClick={() => onClose()}
            className="icon-button"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        <div className={collapsed ? "p-3 border-b border-slate-800 lg:px-2" : "p-3 border-b border-slate-800"}>
          <Button
            variant="secondary"
            size="sm"
            onClick={onNewChat}
            className="w-full justify-center"
            aria-label="New Chat"
            title="New Chat"
          >
            <Plus size={14} />
            <span className={collapsed ? "lg:hidden" : ""}>New Chat</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessionsLoading ? (
            <div className="text-center py-4">
              <LoadingSkeleton
                lines={2}
                message={collapsed ? "" : "Loading chats..."}
                variant="inline"
              />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 px-2">
              <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center mx-auto mb-2 border border-slate-800">
                <MessageSquare className="text-slate-400" size={20} />
              </div>
              <p className={`${collapsed ? "lg:hidden" : ""} text-slate-400 text-xs font-mono mb-1`}>
                No chats yet
              </p>
              <p className={`${collapsed ? "lg:hidden" : ""} text-slate-400 text-[10px] font-light max-w-xs mx-auto`}>
                Send a message to start your first conversation.
              </p>
            </div>
          ) : (
            sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                active={s.id === activeSessionId}
                collapsed={collapsed}
                onSelect={(id) => { onSelect(id); onClose(); }}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
