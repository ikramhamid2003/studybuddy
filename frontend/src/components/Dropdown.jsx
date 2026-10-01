import React, { useState, useRef, useEffect, createContext, useContext } from "react";
import PropTypes from "prop-types";
import { Check } from "lucide-react";

const DropdownContext = createContext(null);

export function Dropdown({
  children,
  open: controlledOpen,
  onOpenChange,
  className = "",
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const containerRef = useRef(null);

  const setOpen = React.useCallback(
    (nextOpen) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape" && isOpen) {
        setOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setOpen]);

  return (
    <DropdownContext.Provider value={{ isOpen, setOpen, containerRef }}>
      <div ref={containerRef} className={`relative inline-block ${className}`}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

Dropdown.propTypes = {
  children: PropTypes.node.isRequired,
  open: PropTypes.bool,
  onOpenChange: PropTypes.func,
  className: PropTypes.string,
};

export function DropdownTrigger({ children, className = "", asChild = false }) {
  const context = useContext(DropdownContext);
  if (!context) throw new Error("DropdownTrigger must be used within a Dropdown");

  const { isOpen, setOpen } = context;

  const handleClick = (e) => {
    e.stopPropagation();
    setOpen(!isOpen);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        children.props.onClick?.(e);
        handleClick(e);
      },
      "aria-haspopup": "menu",
      "aria-expanded": isOpen,
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      className={className}
    >
      {children}
    </button>
  );
}

DropdownTrigger.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  asChild: PropTypes.bool,
};

export function DropdownMenu({
  children,
  align = "right",
  className = "",
  width = "w-56",
}) {
  const context = useContext(DropdownContext);
  if (!context) throw new Error("DropdownMenu must be used within a Dropdown");

  const { isOpen } = context;
  if (!isOpen) return null;

  const alignClass = align === "left" ? "left-0" : "right-0";

  return (
    <div
      role="menu"
      className={`dropdown-panel absolute ${alignClass} top-full mt-1.5 ${width} z-50 animate-scale-in ${className}`}
    >
      <div className="p-1 space-y-0.5">{children}</div>
    </div>
  );
}

DropdownMenu.propTypes = {
  children: PropTypes.node.isRequired,
  align: PropTypes.oneOf(["left", "right"]),
  className: PropTypes.string,
  width: PropTypes.string,
};

const ITEM_VARIANTS = {
  default: "text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 active:bg-slate-100",
  primary: "text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50/80 active:bg-indigo-100/80",
  danger: "text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 active:bg-rose-100/80 focus-visible:ring-rose-400/50",
  confirm: "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50/80 active:bg-emerald-100/80 focus-visible:ring-emerald-400/50",
  quiet: "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 active:bg-slate-100 focus-visible:ring-slate-400/50",
};

export function DropdownItem({
  children,
  onClick,
  icon: Icon,
  variant = "default",
  selected = false,
  disabled = false,
  badge,
  className = "",
  closeOnClick = true,
  ...props
}) {
  const context = useContext(DropdownContext);
  const { setOpen } = context || {};

  const handleClick = (e) => {
    if (disabled) return;
    onClick?.(e);
    if (closeOnClick && setOpen) {
      setOpen(false);
    }
  };

  const variantStyle = ITEM_VARIANTS[variant] || ITEM_VARIANTS.default;

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={`
        w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl
        text-left text-sm font-medium transition-all duration-150 cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50
        disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
        ${selected ? "bg-indigo-50 text-indigo-700 font-semibold" : variantStyle}
        ${className}
      `}
      {...props}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {Icon && (
          <Icon
            size={16}
            className={`flex-shrink-0 transition-colors ${
              selected ? "text-indigo-600" : "text-slate-500 group-hover:text-slate-700"
            }`}
          />
        )}
        <span className="truncate">{children}</span>
      </div>

      {badge && (
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex-shrink-0">
          {badge}
        </span>
      )}

      {selected && (
        <Check size={15} className="text-indigo-600 flex-shrink-0" />
      )}
    </button>
  );
}

DropdownItem.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  icon: PropTypes.elementType,
  variant: PropTypes.oneOf(["default", "primary", "danger", "confirm", "quiet"]),
  selected: PropTypes.bool,
  disabled: PropTypes.bool,
  badge: PropTypes.node,
  className: PropTypes.string,
  closeOnClick: PropTypes.bool,
};

export function DropdownDivider({ className = "" }) {
  return <div className={`my-1 h-px bg-slate-100 ${className}`} />;
}

DropdownDivider.propTypes = {
  className: PropTypes.string,
};

export function DropdownHeader({ children, className = "" }) {
  return (
    <div
      className={`px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider ${className}`}
    >
      {children}
    </div>
  );
}

DropdownHeader.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};
