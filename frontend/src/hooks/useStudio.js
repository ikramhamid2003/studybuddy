import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generateAll,
  listGenerations,
  deleteGeneration,
  listChatSessions,
  getChatSession,
  deleteChatSession,
} from "../utils/api";
import { docIdsOption } from "../components/shared/documentLibrary";
import { useGenerationAbort } from "../components/shared/generationAbort";
import { useLibrary } from "../context/DocumentLibraryContext";

/**
 * State and side effects behind the All-in-One Studio: the tool controls, the
 * active result, quiz answers, the embedded chat and the saved-history list.
 * The page and the components under components/studio/ only render this.
 */
export default function useStudio() {
  // Shared tool controls live here because the All page switches between every
  // generation type without unmounting the whole screen.
  const [type, setType] = useState("explain");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("beginner");
  const [format, setFormat] = useState("bullets");
  const [numQ, setNumQ] = useState("5");
  const [difficulty, setDifficulty] = useState("medium");
  const [numCards, setNumCards] = useState("8");
  const [active, setActive] = useState(null); // { type, topic, result }
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [deckKey, setDeckKey] = useState(0);
  const [chatTurns, setChatTurns] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [historyTab, setHistoryTab] = useState("all");
  const [chatSessions, setChatSessions] = useState([]);
  const [activeChatSessionId, setActiveChatSessionId] = useState(null);
  const [chatStarted, setChatStarted] = useState(false);
  const library = useLibrary();
  const queryClient = useQueryClient();
  const abort = useGenerationAbort();
  const chatBottomRef = useRef(null);

  const refreshChatSessions = useCallback(async () => {
    try {
      const data = await listChatSessions();
      setChatSessions(data);
    } catch (err) {
      toast.error("Couldn't load chat sessions");
    }
  }, []);

  useEffect(() => {
    if (type === "chat") {
      refreshChatSessions();
    }
  }, [type, refreshChatSessions]);

  const openChatSession = useCallback(async (sessionId) => {
    if (sessionId === activeChatSessionId) return;
    try {
      const data = await getChatSession(sessionId);
      setActiveChatSessionId(sessionId);
      setChatTurns(
        data.messages.length
          ? data.messages.map((m) => ({ role: m.role, content: m.content }))
          : []
      );
      setChatStarted(data.messages.length > 0);
    } catch (err) {
      toast.error("Couldn't open that chat");
    }
  }, [activeChatSessionId]);

  const startNewChatSession = useCallback(() => {
    setActiveChatSessionId(null);
    setChatTurns([]);
    setChatStarted(false);
    setChatInput("");
  }, []);

  const deleteChatSessionHandler = useCallback(async (sessionId) => {
    try {
      await deleteChatSession(sessionId);
      setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeChatSessionId === sessionId) {
        setActiveChatSessionId(null);
        setChatTurns([]);
        setChatStarted(false);
      }
      toast.success("Chat deleted");
    } catch (err) {
      toast.error("Couldn't delete chat");
    }
  }, [activeChatSessionId]);

  const { data: history, isLoading: historyLoading } = useQuery({
    // No type filter here: the All page intentionally shows every saved tool.
    queryKey: ["generations"],
    queryFn: () => listGenerations(),
  });

  const deleteGenerationHandler = useCallback(async (item) => {
    if (!window.confirm("Delete this saved generation? This can't be undone.")) return;
    try {
      await deleteGeneration(item.id);
      queryClient.invalidateQueries({ queryKey: ["generations"] });
      queryClient.invalidateQueries({ queryKey: ["usage_stats"] });
      // Close the result panel if it was showing the entry that just vanished.
      setActive((current) => (current?.result === item.result ? null : current));
      toast.success("Deleted from history");
    } catch (err) {
      toast.error(err.message || "Couldn't delete that generation");
    }
  }, [queryClient]);

  const { mutate, isPending: loading } = useMutation({
    mutationFn: (vars) => generateAll(vars.topic, vars.type, vars.options, abort.start()),
    onSuccess: (data, vars) => {
      // Store a normalized active object so ResultView can render any tool from
      // the same shape, whether freshly generated or reopened from history.
      setActive({ type: vars.type, topic: vars.topic, result: data });
      setAnswers({});
      setSubmitted(false);
      queryClient.invalidateQueries({ queryKey: ["generations"] });
      queryClient.invalidateQueries({ queryKey: ["usage_stats"] });
      toast.success("Generated & saved to history!");
    },
    onError: (err) => {
      if (!abort.isAbort(err)) toast.error(err.message || "Generation failed. Try again.");
    },
  });

  const { mutate: sendChatMsg, isPending: chatLoading } = useMutation({
    mutationFn: (vars) =>
      generateAll(vars.msg, "chat", {
        history: vars.history,
        // The All-page chat keeps its own turns, but grounding is per request,
        // so the current document selection has to travel with each message.
        ...docIdsOption(library.selectedIds),
      }),
    onSuccess: (data) => {
      setChatTurns((t) => [...t, { role: "assistant", content: data.reply }]);
      queryClient.invalidateQueries({ queryKey: ["generations"] });
      queryClient.invalidateQueries({ queryKey: ["usage_stats"] });
      queryClient.invalidateQueries({ queryKey: ["chat_sessions"] });
      refreshChatSessions();
    },
    onError: (err) => toast.error(err.message || "Message failed."),
  });

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [chatTurns, chatLoading]);

  function optionsFor() {
    // Convert the currently visible control values into backend option names.
    const docs = docIdsOption(library.selectedIds);
    if (type === "explain") return { level, ...docs };
    if (type === "summarize") return { format, ...docs };
    if (type === "quiz") return { num_questions: parseInt(numQ), difficulty, ...docs };
    if (type === "flashcards") return { num_cards: parseInt(numCards), ...docs };
    return { ...docs };
  }

  function handleGenerate() {
    if (!topic.trim()) return toast.error("Please enter a topic");
    if (type === "summarize" && topic.trim().length < 30) return toast.error("Topic too short — add more content (at least 30 characters)");
    if (type === "chat") {
      // For chat, send the topic as the first message to start the conversation
      setChatStarted(true);
      setChatTurns([{ role: "user", content: topic.trim() }]);
      sendChatMsg({ msg: topic.trim(), history: [] });
      return;
    }
    mutate({ topic: topic.trim(), type, options: optionsFor() });
  }

  function handleChatSend() {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput("");
    setChatStarted(true);
    // Keep a short client-side transcript for the All-page chat UI while the
    // backend also persists each assistant reply as a saved generation.
    const history = chatTurns.slice(-6);
    setChatTurns((t) => [...t, { role: "user", content: msg }]);
    sendChatMsg({ msg, history });
  }

  function handleSelectAnswer(qId, option) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qId]: option }));
  }

  function handleSubmitQuiz(questions) {
    if (Object.keys(answers).length < questions.length) {
      return toast.error(`Answer all ${questions.length} questions first`);
    }
    setSubmitted(true);
  }

  function handleExportCSV() {
    const cards = active?.result?.flashcards || [];
    if (!cards.length) return;
    // Quote escaping keeps commas/quotes inside flashcards import-safe.
    const header = "Front,Back,Hint\n";
    const rows = cards
      .map(
        (c) =>
          `"${c.front.replace(/"/g, '""')}","${c.back.replace(/"/g, '""')}","${(c.hint || "").replace(/"/g, '""')}"`
      )
      .join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + header + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${active.topic || "flashcards"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function openFromHistory(item) {
    setActive({ type: item.type, topic: item.topic, result: item.result });
    setAnswers({});
    setSubmitted(false);
  }

  function retryQuiz() {
    setAnswers({});
    setSubmitted(false);
  }

  function resetCards() {
    setDeckKey((k) => k + 1);
  }

  return {
    library,
    // tool controls
    type, setType,
    topic, setTopic,
    level, setLevel,
    format, setFormat,
    numQ, setNumQ,
    difficulty, setDifficulty,
    numCards, setNumCards,
    loading,
    handleGenerate,
    // active result
    active,
    answers,
    submitted,
    deckKey,
    handleSelectAnswer,
    handleSubmitQuiz,
    handleExportCSV,
    retryQuiz,
    resetCards,
    // embedded chat
    chatSessions,
    activeChatSessionId,
    chatTurns,
    chatStarted,
    chatInput,
    setChatInput,
    chatLoading,
    chatBottomRef,
    startNewChatSession,
    openChatSession,
    deleteChatSessionHandler,
    handleChatSend,
    // saved history
    history,
    historyLoading,
    historyTab,
    setHistoryTab,
    deleteGenerationHandler,
    openFromHistory,
  };
}
