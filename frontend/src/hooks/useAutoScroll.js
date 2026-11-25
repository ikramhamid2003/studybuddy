import { useCallback, useEffect, useRef } from "react";

// How close to the bottom (px) still counts as "following" the conversation.
const FOLLOW_THRESHOLD = 80;

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

/**
 * Keep a transcript pinned to its newest message without fighting the reader.
 *
 * The view follows new content only while the reader is already near the
 * bottom, so scrolling up to reread something is not undone by every streamed
 * token. Sending a message always jumps back down. Smooth scrolling is skipped
 * for users who ask for reduced motion.
 *
 * Attach `scrollRef` and `onScroll` to the scrollable container and `bottomRef`
 * to a sentinel element at its end.
 */
export default function useAutoScroll({ bottomRef, changeKey, lastIsUser }) {
  const scrollRef = useRef(null);
  const followingRef = useRef(true);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    followingRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < FOLLOW_THRESHOLD;
  }, []);

  useEffect(() => {
    if (!followingRef.current && !lastIsUser) return;
    followingRef.current = true;
    bottomRef.current?.scrollIntoView?.({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [bottomRef, changeKey, lastIsUser]);

  return { scrollRef, onScroll };
}
