import React, { useState, useRef, useEffect, useId, useMemo, Children } from "react";
import { ChevronDown, Check } from "lucide-react";
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
  const hasError = Boolean(error);
  const hasHint = Boolean(hint);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-slate-600 text-xs font-medium">
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
            w-full px-4 py-2.5 bg-white border rounded-xl text-slate-900 text-sm placeholder-slate-400
            focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition-colors duration-150
            ${hasError
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-400/30 bg-rose-50/20"
              : "border-slate-200 focus:border-indigo-400"}
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
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-sky-500/80 hover:text-sky-600 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 transition-colors"
            disabled={props.disabled}
            aria-label={rightIcon.type && rightIcon.type.displayName === "EyeOff" ? "Hide password" : "Show password"}
          >
            {rightIcon}
          </button>
        )}
      </div>
      {hasError && (
        <p id="input-error" className="text-rose-500 text-xs font-medium flex items-center gap-1" role="alert">
          <span className="w-3 h-3 text-center leading-none" aria-hidden="true">!</span>
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
  const hasError = Boolean(error);
  const hasHint = Boolean(hint);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-slate-600 text-xs font-medium">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full px-4 py-3 bg-white border rounded-xl text-slate-900 text-sm placeholder-slate-400
          focus:outline-none focus:ring-2 focus:ring-indigo-400/30 transition-colors duration-150 resize-y min-h-[140px] font-body
          ${hasError
            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-400/30 bg-rose-50/20"
            : "border-slate-200 focus:border-indigo-400"}
          ${textareaClassName}
        `}
        aria-invalid={hasError}
        aria-describedby={hasError ? "textarea-error" : hasHint ? "textarea-hint" : undefined}
        {...props}
      />
      {hasError && (
        <p id="textarea-error" className="text-rose-500 text-xs font-medium flex items-center gap-1" role="alert">
          <span className="w-3 h-3 text-center leading-none" aria-hidden="true">!</span>
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

const SELECT_COLORS = {
  amber: {
    focus: "focus:ring-amber-400/40 focus:border-amber-500",
    openRing: "ring-2 ring-amber-400/40 border-amber-500",
    chevron: "text-amber-600",
    activeItem: "bg-amber-50 text-amber-900 font-semibold",
    check: "text-amber-600",
    badge: "bg-amber-100 text-amber-800",
  },
  emerald: {
    focus: "focus:ring-emerald-400/40 focus:border-emerald-500",
    openRing: "ring-2 ring-emerald-400/40 border-emerald-500",
    chevron: "text-emerald-600",
    activeItem: "bg-emerald-50 text-emerald-900 font-semibold",
    check: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-800",
  },
  violet: {
    focus: "focus:ring-violet-400/40 focus:border-violet-500",
    openRing: "ring-2 ring-violet-400/40 border-violet-500",
    chevron: "text-violet-600",
    activeItem: "bg-violet-50 text-violet-900 font-semibold",
    check: "text-violet-600",
    badge: "bg-violet-100 text-violet-800",
  },
  sky: {
    focus: "focus:ring-sky-400/40 focus:border-sky-500",
    openRing: "ring-2 ring-sky-400/40 border-sky-500",
    chevron: "text-sky-600",
    activeItem: "bg-sky-50 text-sky-900 font-semibold",
    check: "text-sky-600",
    badge: "bg-sky-100 text-sky-800",
  },
  rose: {
    focus: "focus:ring-rose-400/40 focus:border-rose-500",
    openRing: "ring-2 ring-rose-400/40 border-rose-500",
    chevron: "text-rose-600",
    activeItem: "bg-rose-50 text-rose-900 font-semibold",
    check: "text-rose-600",
    badge: "bg-rose-100 text-rose-800",
  },
  fuchsia: {
    focus: "focus:ring-fuchsia-400/40 focus:border-fuchsia-500",
    openRing: "ring-2 ring-fuchsia-400/40 border-fuchsia-500",
    chevron: "text-fuchsia-600",
    activeItem: "bg-fuchsia-50 text-fuchsia-900 font-semibold",
    check: "text-fuchsia-600",
    badge: "bg-fuchsia-100 text-fuchsia-800",
  },
  indigo: {
    focus: "focus:ring-indigo-400/40 focus:border-indigo-500",
    openRing: "ring-2 ring-indigo-400/40 border-indigo-500",
    chevron: "text-indigo-600",
    activeItem: "bg-indigo-50 text-indigo-900 font-semibold",
    check: "text-indigo-600",
    badge: "bg-indigo-100 text-indigo-800",
  },
};

export function Select({
  label,
  children,
  options: propOptions,
  value,
  defaultValue,
  onChange,
  className = "",
  selectClassName = "",
  panelClassName = "",
  color = "amber",
  error,
  hint,
  placeholder = "Select an option",
  disabled = false,
  name,
  id,
  "aria-label": ariaLabel,
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listboxRef = useRef(null);

  const hasError = Boolean(error);
  const hasHint = Boolean(hint);
  const colorTheme = SELECT_COLORS[color] || SELECT_COLORS.amber;

  // Extract options from props or children
  const options = useMemo(() => {
    if (propOptions && Array.isArray(propOptions)) {
      return propOptions;
    }

    const extracted = [];
    Children.forEach(children, (child) => {
      if (!child) return;
      if (child.props) {
        extracted.push({
          value: child.props.value !== undefined ? child.props.value : child.props.children,
          label: child.props.children || child.props.value || "",
          disabled: Boolean(child.props.disabled),
          icon: child.props.icon,
          badge: child.props.badge,
        });
      }
    });
    return extracted;
  }, [children, propOptions]);

  // Handle controlled / uncontrolled state
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(
    defaultValue !== undefined ? defaultValue : (options[0]?.value ?? "")
  );
  const currentValue = isControlled ? value : uncontrolledValue;

  const selectedOption = options.find(
    (opt) => String(opt.value) === String(currentValue)
  );

  const displayLabel = selectedOption ? selectedOption.label : (placeholder || "");

  const handleSelect = (option) => {
    if (option.disabled || disabled) return;

    if (!isControlled) {
      setUncontrolledValue(option.value);
    }

    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || "",
          id: id || "",
          value: option.value,
        },
        currentTarget: {
          name: name || "",
          id: id || "",
          value: option.value,
        },
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      onChange(syntheticEvent);
    }

    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        const idx = options.findIndex((opt) => String(opt.value) === String(currentValue));
        setFocusedIndex(idx >= 0 ? idx : 0);
      } else {
        setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        const idx = options.findIndex((opt) => String(opt.value) === String(currentValue));
        setFocusedIndex(idx >= 0 ? idx : options.length - 1);
      } else {
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      }
    } else if (e.key === "Enter" || e.key === " ") {
      if (isOpen && focusedIndex >= 0 && options[focusedIndex]) {
        e.preventDefault();
        handleSelect(options[focusedIndex]);
      } else if (!isOpen) {
        e.preventDefault();
        setIsOpen(true);
        const idx = options.findIndex((opt) => String(opt.value) === String(currentValue));
        setFocusedIndex(idx >= 0 ? idx : 0);
      }
    } else if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    } else if (e.key === "Tab") {
      if (isOpen) {
        setIsOpen(false);
      }
    }
  };

  const generatedId = useId();
  const listboxId = `${id || generatedId}-listbox`;

  return (
    <div ref={containerRef} className={`flex flex-col gap-1.5 relative ${className}`}>
      {label && (
        <label className="text-slate-600 text-xs font-medium">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-label={ariaLabel || label || placeholder}
          aria-invalid={hasError}
          aria-describedby={hasError ? "select-error" : hasHint ? "select-hint" : undefined}
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={`
            w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-slate-900 text-sm
            bg-white border cursor-pointer transition-all duration-150 font-body font-medium text-left
            shadow-sm hover:border-slate-300 hover:shadow focus:outline-none focus:ring-2
            disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
            ${
              hasError
                ? "bg-rose-50/20 border-rose-400 focus:border-rose-500 focus:ring-rose-400/30 text-rose-900"
                : isOpen
                ? colorTheme.openRing
                : `border-slate-200 ${colorTheme.focus}`
            }
            ${selectClassName}
          `}
          {...props}
        >
          <span className="truncate flex-1">
            {displayLabel}
          </span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`flex-shrink-0 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            } ${hasError ? "text-rose-500" : colorTheme.chevron}`}
          />
        </button>

        {/* Custom Dropdown Panel */}
        {isOpen && (
          <div
            id={listboxId}
            ref={listboxRef}
            role="listbox"
            tabIndex={-1}
            className={`
              dropdown-panel absolute left-0 right-0 top-full mt-1.5 z-50
              max-h-60 overflow-y-auto animate-scale-in ${panelClassName}
            `}
          >
            <div className="p-1 space-y-0.5">
              {options.map((option, index) => {
                const isSelected = String(option.value) === String(currentValue);
                const isFocused = focusedIndex === index;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`
                      w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl
                      text-left text-sm font-medium transition-all duration-150 cursor-pointer
                      disabled:opacity-40 disabled:cursor-not-allowed
                      ${
                        isSelected
                          ? colorTheme.activeItem
                          : isFocused
                          ? "bg-slate-100/90 text-slate-900"
                          : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {option.icon && (
                        <span className="flex-shrink-0 text-slate-500">
                          {option.icon}
                        </span>
                      )}
                      <span className="truncate">{option.label}</span>
                    </div>

                    {option.badge && (
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full flex-shrink-0 ${isSelected ? colorTheme.badge : "bg-slate-100 text-slate-600"}`}>
                        {option.badge}
                      </span>
                    )}

                    {isSelected && (
                      <Check size={15} className={`${colorTheme.check} flex-shrink-0`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {hasError && (
        <p id="select-error" className="text-rose-500 text-xs font-medium flex items-center gap-1" role="alert">
          <span className="w-3 h-3 text-center leading-none" aria-hidden="true">!</span>
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
  disabled: PropTypes.bool,
};

Textarea.propTypes = {
  label: PropTypes.string,
  className: PropTypes.string,
  textareaClassName: PropTypes.string,
  error: PropTypes.string,
  hint: PropTypes.string,
  disabled: PropTypes.bool,
};

Select.propTypes = {
  label: PropTypes.string,
  children: PropTypes.node,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.node.isRequired,
      disabled: PropTypes.bool,
      icon: PropTypes.node,
      badge: PropTypes.node,
    })
  ),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  className: PropTypes.string,
  selectClassName: PropTypes.string,
  panelClassName: PropTypes.string,
  color: PropTypes.oneOf(["amber", "emerald", "violet", "sky", "rose", "fuchsia", "indigo"]),
  error: PropTypes.string,
  hint: PropTypes.string,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  name: PropTypes.string,
  id: PropTypes.string,
  "aria-label": PropTypes.string,
};

export {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
  DropdownHeader,
} from "./Dropdown";
