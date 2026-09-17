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
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
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

export function Select({
  label,
  children,
  className = "",
  selectClassName = "",
  error,
  hint,
  ...props
}) {
  // Children remain explicit so each page controls its own option labels.
  const hasError = Boolean(error);
  const hasHint = Boolean(hint);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-slate-400 text-xs font-mono uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        className={`
          w-full px-4 py-2.5 bg-slate-800 border rounded-xl text-white text-sm
          focus:outline-none focus:ring-1 focus:ring-amber-400/30 transition-colors duration-150 cursor-pointer
          ${hasError
            ? "border-rose-500/50 focus:border-rose-400 focus:ring-rose-400/30"
            : "border-slate-700 focus:border-amber-400"}
          ${selectClassName}
        `}
        aria-invalid={hasError}
        aria-describedby={hasError ? "select-error" : hasHint ? "select-hint" : undefined}
        {...props}
      >
        {children}
      </select>
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
  error: PropTypes.string,
  hint: PropTypes.string,
};
