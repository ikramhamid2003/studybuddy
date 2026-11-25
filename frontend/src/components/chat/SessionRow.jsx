import { useRef, useState } from "react";
import { Check, MessageSquare, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";

export default function SessionRow({ session, active, onSelect, onRename, onDelete, collapsed }) {
  // Inline rename state stays local to each sidebar row.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);

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

  function closeMenu() {
    setMenuOpen(false);
    // Hand focus back to the control that opened the menu.
    menuButtonRef.current?.focus();
  }

  const iconClass = `flex-shrink-0 transition-colors ${
    active ? "text-amber-300" : "text-slate-500 group-hover:text-amber-300"
  }`;
  const selectLayout = `flex flex-1 min-w-0 items-center gap-2 py-2.5 ${
    collapsed ? "lg:justify-center lg:px-2" : "pl-3"
  }`;

  return (
    <div className="relative">
      <div
        className={`group flex items-center gap-1 rounded-xl border transition-all duration-150 ${
          collapsed ? "" : "pr-1"
        } ${
          active
            ? "bg-amber-500/20 border-amber-400/50 shadow-[0_0_18px_-6px_rgba(245,158,11,0.5)]"
            : "border-transparent hover:bg-amber-500/10 hover:border-amber-400/25"
        }`}
      >
        {editing ? (
          <div className={selectLayout}>
            <MessageSquare size={14} className={iconClass} aria-hidden="true" />
            <input
              autoFocus
              aria-label="Chat title"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit(e);
                if (e.key === "Escape") cancelEdit(e);
              }}
              className={`${hideWhenCollapsed} flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400`}
            />
          </div>
        ) : (
          // A real button, so the row is reachable and operable from the keyboard.
          <button
            type="button"
            onClick={() => onSelect(session.id)}
            aria-current={active ? "true" : undefined}
            aria-label={session.title}
            title={session.title}
            className={`${selectLayout} text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70`}
          >
            <MessageSquare size={14} className={iconClass} aria-hidden="true" />
            <span
              className={`${hideWhenCollapsed} flex-1 min-w-0 truncate text-xs transition-colors ${
                active
                  ? "text-amber-200 font-semibold"
                  : "text-slate-400 group-hover:text-slate-200"
              }`}
            >
              {session.title}
            </span>
          </button>
        )}

        {/* Action menu button - always visible */}
        <div
          className={`relative ${hideWhenCollapsed}`}
          onKeyDown={(e) => {
            if (e.key === "Escape" && menuOpen) {
              e.stopPropagation();
              closeMenu();
            }
          }}
        >
          <button
            ref={menuButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="icon-button flex-shrink-0"
            title="More actions"
            aria-label={`Actions for ${session.title}`}
            aria-haspopup="menu"
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
              <div className="dropdown-panel absolute right-0 top-full mt-1.5 w-40 z-50 animate-scale-in">
                <div className="p-1 space-y-0.5">
                  {!editing && (
                    <>
                      <button
                        type="button"
                        onClick={handleRename}
                        className="menu-item text-slate-700 hover:text-slate-900 hover:bg-slate-100/90"
                      >
                        <Pencil size={14} className="flex-shrink-0 text-slate-500" />
                        Rename
                      </button>
                      <button
                        type="button"
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
                        type="button"
                        onClick={commitEdit}
                        className="menu-item menu-item--confirm"
                      >
                        <Check size={14} className="flex-shrink-0" />
                        Save
                      </button>
                      <button
                        type="button"
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
