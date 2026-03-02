export function Input({ label, className = "", ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-slate-400 text-xs font-mono uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        className="
          w-full px-4 py-2.5 bg-slate-800 border border-slate-700
          rounded-xl text-white text-sm placeholder-slate-500
          focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30
          transition-colors duration-150 font-body
        "
        {...props}
      />
    </div>
  );
}

export function Textarea({ label, className = "", ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-slate-400 text-xs font-mono uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        className="
          w-full px-4 py-3 bg-slate-800 border border-slate-700
          rounded-xl text-white text-sm placeholder-slate-500
          focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30
          transition-colors duration-150 resize-y min-h-[140px] font-body
        "
        {...props}
      />
    </div>
  );
}

export function Select({ label, children, className = "", ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-slate-400 text-xs font-mono uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        className="
          w-full px-4 py-2.5 bg-slate-800 border border-slate-700
          rounded-xl text-white text-sm
          focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30
          transition-colors duration-150 cursor-pointer
        "
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
