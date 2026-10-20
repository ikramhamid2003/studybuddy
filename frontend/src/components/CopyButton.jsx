import { useState } from "react";
import { Copy, Check } from "lucide-react";
import PropTypes from "prop-types";
import Button from "./Button";
import { copyToClipboard } from "../utils/clipboard";

/**
 * Shared copy-to-clipboard control for AI-generated result panels.
 */
export default function CopyButton({ text, label = "Copy", color, className = "" }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        if (!text) return;
        copyToClipboard(text, setCopied);
      }}
      className={`h-8 w-8 p-0 ${className}`}
      aria-label={copied ? "Copied!" : label}
      color={color}
      disabled={!text}
    >
      {copied ? (
        <Check className="text-emerald-600" size={14} />
      ) : (
        <Copy className="text-slate-500" size={14} />
      )}
    </Button>
  );
}

CopyButton.propTypes = {
  text: PropTypes.string,
  label: PropTypes.string,
  color: PropTypes.oneOf(["amber", "emerald", "violet", "sky", "rose", "fuchsia"]),
  className: PropTypes.string,
};
