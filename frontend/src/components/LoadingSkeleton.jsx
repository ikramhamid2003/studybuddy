export default function LoadingSkeleton({ lines = 3, message = "Thinking..." }) {
  return (
    <div className="animate-fade-in space-y-4">
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
