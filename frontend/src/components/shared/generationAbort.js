import { useCallback, useEffect, useRef } from "react";

/**
 * Gives a tool page an AbortSignal for the generation it starts and cancels it
 * when the page unmounts. Result state lives in the component, so a request that
 * outlives the page has nowhere to land — while the provider still bills the
 * generation to the last token. One controller at a time, which matches every
 * page here: each generation is single-flight behind its own loading flag.
 */
export function useGenerationAbort() {
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const start = useCallback(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    return controller.signal;
  }, []);

  // An aborted request is a cancellation, not a failure: pages must not toast it.
  const isAbort = useCallback((err) => err?.name === "AbortError", []);

  return { start, isAbort };
}
