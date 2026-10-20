/**
 * One-shot hand-off from the home focus box to whichever tool it routed to.
 *
 * Router state would be lost on a hard refresh and a global store is overkill
 * for a single string, so the topic travels through sessionStorage and is
 * deleted on read — a tool either picks it up once or never sees it.
 */
import { useEffect } from "react";

const KEY = "studybuddy:home-topic";

export function stashPendingTopic(text) {
  const value = (text || "").trim();
  if (!value) return;
  try {
    sessionStorage.setItem(KEY, value);
  } catch {
    // Private mode or a full quota must not block navigation.
  }
}

export function takePendingTopic() {
  try {
    const value = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return value || "";
  } catch {
    return "";
  }
}

/**
 * Feed a stashed topic into a page's setter once, after mount.
 * Consuming in an effect (not a useState initializer) keeps the read-once
 * delete safe under StrictMode, which double-invokes the render phase.
 */
export function usePendingTopic(setValue) {
  useEffect(() => {
    const value = takePendingTopic();
    if (value) setValue(value);
    // Setters from useState are stable, so this runs exactly once per mount.
  }, [setValue]);
}
