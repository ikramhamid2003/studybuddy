with open('src/pages/ChatPage.jsx', 'r') as f:
    content = f.read()

# Remove the URLBadge function (lines 30-39)
content = content.replace('''function URLBadge({ hasUrl }) {
  return (
    <span
      className="absolute -top-1 -right-1 rounded-full bg-amber-500/90 text-xs text-amber-300 border border-slate-950/50 p-0.5 shadow-xs"
      title="Content from website"
    >
      🌐
    </span>
  );
}''', '')

# Replace MessageBubble function
old_bubble = '''function MessageBubble({ msg }) {
  const isUser = msg.role === "user";

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
      <div className="flex flex-col gap-1 max-w-[78%] relative">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
            ${isUser
              ? "bg-gradient-to-r from-rose-500 to-rose-400 text-white font-medium rounded-tr-sm shadow-[0_4px_15px_rgba(244,63,94,0.12)]"
              : "backdrop-blur-md bg-slate-900/40 text-slate-200 border border-slate-800/80 rounded-tl-sm whitespace-pre-wrap"
            }`}
        >
          {msg.content}
        </div>
      </div>
    </div>
  );
}'''

new_bubble = '''function hasUrlInContent(content) {
  if (!content) return false;
  try {
    const urlPattern = /https?:\/\/\S+/g;
    return urlPattern.test(content);
  } catch {
    return false;
  }
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";

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
      <div className="flex flex-col gap-1 max-w-[78%] relative">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
            ${isUser
              ? "bg-gradient-to-r from-rose-500 to-rose-400 text-white font-medium rounded-tr-sm shadow-[0_4px_15px_rgba(244,63,94,0.12)]"
              : "backdrop-blur-md bg-slate-900/40 text-slate-200 border border-slate-800/80 rounded-tl-sm whitespace-pre-wrap"
            }`}
        >
          {msg.content}
          {hasUrlInContent(msg.content) && (
            <span
              className="absolute -top-1 -right-1 rounded-full bg-amber-500/90 text-xs text-amber-300 border border-slate-950/50 p-0.5 shadow-xs"
              title="Link detected"
            >
              🔗
            </span>
          )}
        </div>
      </div>
    </div>
  );
}'''

content = content.replace(old_bubble, new_bubble)

with open('src/pages/ChatPage.jsx', 'w') as f:
    f.write(content)
print('ChatPage.jsx updated successfully')