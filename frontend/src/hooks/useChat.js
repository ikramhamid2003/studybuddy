import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  sendChatStream,
  listChatSessions,
  createChatSession,
  getChatSession,
  renameChatSession,
  deleteChatSession,
} from "../utils/api";
import { usePendingTopic } from "../utils/pendingTopic";
import { WELCOME, LAST_CHAT_SESSION_KEY } from "../components/chat/chatConstants";

/**
 * All state and side effects behind the Study Chat page: the session list,
 * the open transcript, and the streaming send. The page itself only lays this
 * out. `library` supplies the documents selected to ground each turn.
 */
export default function useChat(library) {
  // Sessions power the sidebar; messages power the currently opened transcript.
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([WELCOME]);
  // Picks up a question typed into the home focus box, if one was stashed.
  const [input, setInput] = useState("");
  usePendingTopic(setInput);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const initialSessionOpenedRef = useRef(false);
  const streamRef = useRef(null);
  const openRequestIdRef = useRef(0);
  const queryClient = useQueryClient();

  // A stream keeps running after the reader walks away: the provider is still
  // billing it, and its late chunks would append into whichever transcript is on
  // screen by then. Aborting the fetch ends both problems.
  useEffect(() => () => streamRef.current?.abort(), []);

  const stopStream = useCallback(() => {
    streamRef.current?.abort();
    streamRef.current = null;
    setLoading(false);
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      // Re-fetch after sends/renames/deletes so ordering and auto titles stay
      // aligned with the backend.
      const data = await listChatSessions();
      setSessions(data);
    } catch (err) {
      toast.error("Couldn't load your chats");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const openSession = useCallback(
    async (sessionId) => {
      if (sessionId === activeSessionId) return;
      // Switching chats stops the reply where it is — those tokens are already
      // spent, but its text must not land in the transcript being opened.
      stopStream();
      const requestId = ++openRequestIdRef.current;
      try {
        // Opening a session hydrates the full transcript from persisted messages.
        const data = await getChatSession(sessionId);
        // Two quick clicks must render the last one, not whichever answers first.
        if (requestId !== openRequestIdRef.current) return;
        setActiveSessionId(sessionId);
        localStorage.setItem(LAST_CHAT_SESSION_KEY, String(sessionId));
        setMessages(
          data.messages.length
            ? data.messages.map((m) => ({ role: m.role, content: m.content }))
            : [WELCOME]
        );
      } catch (err) {
        if (requestId !== openRequestIdRef.current) return;
        toast.error("Couldn't open that chat");
      }
    },
    [activeSessionId, stopStream]
  );

  useEffect(() => {
    if (sessionsLoading || initialSessionOpenedRef.current || sessions.length === 0) {
      return;
    }

    // On first load, restore the last selected chat when possible.
    initialSessionOpenedRef.current = true;
    const lastSessionId = Number(localStorage.getItem(LAST_CHAT_SESSION_KEY));
    const sessionToOpen =
      sessions.find((session) => session.id === lastSessionId) || sessions[0];
    openSession(sessionToOpen.id);
  }, [openSession, sessions, sessionsLoading]);

  function startNewChat() {
    stopStream();
    // A new chat remains unsaved until the first user message creates a session.
    setActiveSessionId(null);
    localStorage.removeItem(LAST_CHAT_SESSION_KEY);
    setMessages([WELCOME]);
    setInput("");
    inputRef.current?.focus();
  }

  async function handleRename(sessionId, title) {
    try {
      await renameChatSession(sessionId, title);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
      );
      queryClient.invalidateQueries({ queryKey: ["chat_sessions"] });
    } catch (err) {
      toast.error("Couldn't rename chat");
    }
  }

  async function handleDelete(sessionId) {
    if (!window.confirm("Delete this chat? This can't be undone.")) return;
    try {
      await deleteChatSession(sessionId);
      // Update local sidebar state immediately, then let the next refresh keep
      // ordering consistent with the backend.
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      queryClient.invalidateQueries({ queryKey: ["chat_sessions"] });
      if (sessionId === activeSessionId) {
        startNewChat();
      } else if (String(sessionId) === localStorage.getItem(LAST_CHAT_SESSION_KEY)) {
        localStorage.removeItem(LAST_CHAT_SESSION_KEY);
      }
      toast.success("Chat deleted");
    } catch (err) {
      toast.error("Couldn't delete chat");
    }
  }

  async function handleSend(text) {
    const userMsg = (text || input).trim();
    if (!userMsg || loading) return;
    setInput("");

    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      // Lazily create a session on the first real message of a new chat.
      let sessionId = activeSessionId;
      if (sessionId === null) {
        const created = await createChatSession();
        sessionId = created.id;
        setActiveSessionId(sessionId);
        localStorage.setItem(LAST_CHAT_SESSION_KEY, String(sessionId));
      }

      // Build a system message with all session titles so the model can answer
      // questions like "what are my other chats?".
      const sessionList = sessions
        .filter((s) => s.id !== sessionId)
        .map((s) => `- "${s.title}" (id: ${s.id})`)
        .join("\n");
      const systemPrompt = `You are a helpful AI study assistant. The user has the following other chat sessions:\n${sessionList || "(none)"}\nYou can reference these by title if the user asks about their other chats.`;

      let isFirstChunk = true;
      // Selected documents ground this turn; the citations come back on the
      // closing SSE frame and are attached to the reply they produced.
      const documentIds = library.selectedIds.size
        ? [...library.selectedIds]
        : undefined;

      const controller = new AbortController();
      streamRef.current = controller;

      await sendChatStream(
        userMsg,
        [{ role: "system", content: systemPrompt }],
        sessionId,
        (chunk) => {
          // The first chunk replaces the typing indicator with a real assistant
          // bubble; later chunks append into that same bubble.
          if (isFirstChunk) {
            isFirstChunk = false;
            setLoading(false);
            setMessages((m) => [...m, { role: "assistant", content: chunk }]);
          } else {
            setMessages((m) => {
              const next = [...m];
              const last = next[next.length - 1];
              if (last && last.role === "assistant") {
                // Replace rather than mutate: an in-place append makes this
                // updater impure, and React re-running it duplicates text.
                next[next.length - 1] = { ...last, content: last.content + chunk };
              }
              return next;
            });
          }
        },
        (_doneSessionId, sources) => {
          streamRef.current = null;
          if (sources?.length) {
            setMessages((m) => {
              const next = [...m];
              const last = next[next.length - 1];
              if (last && last.role === "assistant") {
                next[next.length - 1] = { ...last, sources };
              }
              return next;
            });
          }
          setLoading(false);
          inputRef.current?.focus();
          // Pick up the auto-generated title and updated sidebar ordering.
          refreshSessions();
          // The dashboard reads its session list and its budget meter from the
          // shared cache, and no other site invalidates either key — without
          // this the meter keeps showing the spend from before the turn.
          queryClient.invalidateQueries({ queryKey: ["chat_sessions"] });
          queryClient.invalidateQueries({ queryKey: ["usage_stats"] });
        },
        (err) => {
          streamRef.current = null;
          toast.error(err.message || "Failed to send message");
          setLoading(false);
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content: "Connection error. Make sure your Django backend is running.",
            },
          ]);
          inputRef.current?.focus();
        },
        documentIds,
        controller.signal
      );
    } catch (err) {
      toast.error(err.message || "Failed to initiate stream");
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return {
    sessions,
    sessionsLoading,
    activeSessionId,
    messages,
    input,
    setInput,
    loading,
    bottomRef,
    inputRef,
    openSession,
    startNewChat,
    handleRename,
    handleDelete,
    handleSend,
  };
}
