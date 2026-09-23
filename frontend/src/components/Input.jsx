import { ChevronDown } from "lucide-react";
import PropTypes from "prop-types";

export function Input({
  label,
  className = "",
  inputClassName = "",
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconClick,
  ...props
}) {
  // Props are forwarded so pages can attach value, handlers, aria labels, etc.
  const hasError = Boolean(error);
  const hasHint = Boolean(hint);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-slate-400 text-xs font-mono uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          className={`
            w-full px-4 py-2.5 bg-slate-800 border rounded-xl text-white text-sm placeholder-slate-500
            focus:outline-none focus:ring-1 focus:ring-amber-400/30 transition-colors duration-150 font-body
            ${hasError
              ? "border-rose-500/50 focus:border-rose-400 focus:ring-rose-400/30"
              : "border-slate-700 focus:border-amber-400"}
            ${leftIcon ? "pl-10" : ""}
            ${rightIcon ? "pr-10" : ""}
            ${inputClassName}
          `}
          aria-invalid={hasError}
          aria-describedby={hasError ? "input-error" : hasHint ? "input-hint" : undefined}
          {...props}
        />
        {rightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-sky-400/70 hover:text-sky-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 transition-colors"
            disabled={props.disabled}
            aria-label={rightIcon.type && rightIcon.type.displayName === "EyeOff" ? "Hide password" : "Show password"}
          >
            {rightIcon}
          </button>
        )}
      </div>
      {hasError && (
        <p id="input-error" className="text-rose-400 text-xs font-mono flex items-center gap-1" role="alert">
          <span className="w-3 h-3" aria-hidden="true">!</span>
          {error}
        </p>
      )}
      {hasHint && !hasError && (
        <p id="input-hint" className="text-slate-500 text-xs font-light">
          {hint}
        </p>
      )}
    </div>
  );
}

export function Textarea({
  label,
  className = "",
  textareaClassName = "",
  error,
  hint,
  ...props
}) {
  // Shares the same visual language as Input, with vertical resizing enabled.
  const hasError = Boolean(error);
  const hasHint = Boolean(hint);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-slate-400 text-xs font-mono uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full px-4 py-3 bg-slate-800 border rounded-xl text-white text-sm placeholder-slate-500
          focus:outline-none focus:ring-1 focus:ring-amber-400/30 transition-colors duration-150 resize-y min-h-[140px] font-body
          ${hasError
            ? "border-rose-500/50 focus:border-rose-400 focus:ring-rose-400/30"
            : "border-slate-700 focus:border-amber-400"}
          ${textareaClassName}
        `}
        aria-invalid={hasError}
        aria-describedby={hasError ? "textarea-error" : hasHint ? "textarea-hint" : undefined}
        {...props}
      />
      {hasError && (
        <p id="textarea-error" className="text-rose-400 text-xs font-mono flex items-center gap-1" role="alert">
          <span className="w-3 h-3" aria-hidden="true">!</span>
          {error}
        </p>
      )}
      {hasHint && !hasError && (
        <p id="textarea-hint" className="text-slate-500 text-xs font-light">
          {hint}
        </p>
      )}
    </div>
  );
}

// Only focus colour lives here: the native option popup is painted by the OS,
// so it is styled once globally in index.css instead of per colour.
const SELECT_COLORS = {
  amber: {
    focus: "focus:ring-amber-400/40 focus:border-amber-400",
    chevron: "text-amber-300",
  },
  emerald: {
    focus: "focus:ring-emerald-400/40 focus:border-emerald-400",
    chevron: "text-emerald-300",
  },
  violet: {
    focus: "focus:ring-violet-400/40 focus:border-violet-400",
    chevron: "text-violet-300",
  },
  sky: {
    focus: "focus:ring-sky-400/40 focus:border-sky-400",
    chevron: "text-sky-300",
  },
  rose: {
    focus: "focus:ring-rose-400/40 focus:border-rose-400",
    chevron: "text-rose-300",
  },
};

export function Select({
  label,
  children,
  className = "",
  selectClassName = "",
  color = "amber",
  error,
  hint,
  ...props
}) {
  // Children remain explicit so each page controls its own option labels.
  const hasError = Boolean(error);
  const hasHint = Boolean(hint);
  const colorTheme = SELECT_COLORS[color] || SELECT_COLORS.amber;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-slate-400 text-xs font-mono uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`
            w-full appearance-none px-4 py-2.5 pr-10 rounded-xl text-white text-sm
            border cursor-pointer transition-[background-color,border-color,box-shadow] duration-150
            focus:outline-none focus:ring-2 font-body
            ${hasError
              ? "bg-rose-500/10 border-rose-500/50 focus:border-rose-400 focus:ring-rose-400/40"
              : `bg-slate-800/80 border-slate-700 hover:border-slate-500 hover:bg-slate-800 ${colorTheme.focus}`}
            ${selectClassName}
          `}
          aria-invalid={hasError}
          aria-describedby={hasError ? "select-error" : hasHint ? "select-hint" : undefined}
          {...props}
        >
          {children}
        </select>
        {/* A native select cannot carry an inset icon, so the chevron is drawn
            over it. `appearance-none` above removes the OS arrow first. */}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 ${hasError ? "text-rose-300" : colorTheme.chevron}`}
        />
      </div>
      {hasError && (
        <p id="select-error" className="text-rose-400 text-xs font-mono flex items-center gap-1" role="alert">
          <span className="w-3 h-3" aria-hidden="true">!</span>
          {error}
        </p>
      )}
      {hasHint && !hasError && (
        <p id="select-hint" className="text-slate-500 text-xs font-light">
          {hint}
        </p>
      )}
    </div>
  );
}

Input.propTypes = {
  label: PropTypes.string,
  className: PropTypes.string,
  inputClassName: PropTypes.string,
  error: PropTypes.string,
  hint: PropTypes.string,
  leftIcon: PropTypes.node,
  rightIcon: PropTypes.node,
  onRightIconClick: PropTypes.func,
};

Textarea.propTypes = {
  label: PropTypes.string,
  className: PropTypes.string,
  textareaClassName: PropTypes.string,
  error: PropTypes.string,
  hint: PropTypes.string,
};

Select.propTypes = {
  label: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  selectClassName: PropTypes.string,
  color: PropTypes.oneOf(["amber", "emerald", "violet", "sky", "rose"]),
  error: PropTypes.string,
  hint: PropTypes.string,
};
