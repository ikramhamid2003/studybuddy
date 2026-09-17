export default function LoadingSkeleton({ lines = 3, message = "Thinking...", variant = "default" }) {
  const variants = {
    default: "animate-fade-in space-y-4",
    card: "animate-fade-in space-y-4 p-6",
    inline: "flex items-center gap-3",
  };

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="typing-dot w-2 h-2 rounded-full bg-amber-400 inline-block"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <span className="font-mono text-xs text-slate-500">{message}</span>
      </div>
    );
  }

  return (
    <div className={variants[variant] || variants.default}>
      {/* Animated dots communicate active AI work before content is available. */}
      <div className="flex items-center gap-3 text-slate-400 text-sm">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="typing-dot w-2 h-2 rounded-full bg-amber-400 inline-block"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <span className="font-mono text-xs text-slate-500">{message}</span>
      </div>

      {/* Widths shrink per row to mimic varied text lines. */}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="shimmer h-4 rounded-lg bg-slate-800"
          style={{ width: `${85 - i * 12}%` }}
        />
      ))}
    </div>
  );
}
