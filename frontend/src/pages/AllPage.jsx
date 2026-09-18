import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Sparkles,
  History,
  RotateCcw,
  ArrowRight,
  Send,
  Bot,
  Volume2,
  Download,
  Copy,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input, Select } from "../components/Input";
import LoadingSkeleton from "../components/LoadingSkeleton";
import Flashcard from "../components/shared/Flashcard";
import ChatBubble from "../components/shared/ChatBubble";
import ScoreCard from "../components/shared/ScoreCard";
import SectionTitle from "../components/shared/SectionTitle";
import TypeBadge from "../components/shared/TypeBadge";
import { generateAll, listGenerations, listChatSessions, getChatSession, deleteChatSession } from "../utils/api";

const TOOL_OPTIONS = [
  { value: "explain", label: "Explain" },
  { value: "summarize", label: "Summarize" },
  { value: "quiz", label: "Quiz" },
  { value: "flashcards", label: "Flashcards" },
  { value: "chat", label: "Chat" },
];

function ChatTyping() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-center flex-shrink-0">
        <Bot size={15} className="text-rose-400" />
      </div>
      <div className="backdrop-blur-md bg-slate-900/40 border border-slate-800/80 rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5 shadow-sm">
        <span className="typing-dot w-2 h-2 rounded-full bg-rose-400" />
        <span className="typing-dot w-2 h-2 rounded-full bg-rose-400" />
        <span className="typing-dot w-2 h-2 rounded-full bg-rose-400" />
      </div>
    </div>
  );
}

function ResultView({ active, answers, submitted, onSelectAnswer, onSubmitQuiz, onRetryQuiz, onExportCSV, onResetCards, deckKey }) {
  // Central render switch keeps the All page's five tools sharing one result
  // surface instead of duplicating entire page implementations.
  const { type, result } = active;

  if (type === "explain") {
    return (
      <div className="space-y-4">
        <Card accent="amber" variant="elevated">
          <div className="flex items-center justify-between mb-3">
            <SectionTitle color="text-amber-400">Explanation</SectionTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard.writeText([
                result.explanation,
                result.key_points?.length ? `\n\nKey Points:\n${result.key_points.map(p => `• ${p}`).join("\n")}` : "",
                result.analogy ? `\n\nAnalogy:\n${result.analogy}` : "",
                result.example ? `\n\nExample:\n${result.example}` : "",
              ].filter(Boolean).join(""))}
              className="h-7 w-7 p-0"
              aria-label="Copy explanation"
            >
              <Copy size={14} className="text-slate-400" />
            </Button>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{result.explanation}</p>
        </Card>
        {result.key_points?.length > 0 && (
          <Card accent="emerald" variant="elevated">
            <SectionTitle color="text-emerald-400">Key Points</SectionTitle>
            <ul className="space-y-2">
              {result.key_points.map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="text-emerald-400 font-bold mt-0.5 flex-shrink-0">→</span>
                  {point}
                </li>
              ))}
            </ul>
          </Card>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          {result.analogy && (
            <Card accent="violet" variant="elevated">
              <SectionTitle color="text-violet-400">Analogy</SectionTitle>
              <p className="text-slate-300 text-sm leading-relaxed italic">{result.analogy}</p>
            </Card>
          )}
          {result.example && (
            <Card accent="sky" variant="elevated">
              <SectionTitle color="text-sky-400">Example</SectionTitle>
              <p className="text-slate-300 text-sm leading-relaxed">{result.example}</p>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (type === "summarize") {
    return (
      <div className="space-y-4">
        <Card accent="emerald" variant="elevated">
          <div className="flex items-center justify-between mb-3">
            <SectionTitle color="text-emerald-400">Summary</SectionTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard.writeText([
                result.summary,
                result.key_concepts?.length ? `\n\nKey Concepts:\n${result.key_concepts.map(c => `• ${c}`).join("\n")}` : "",
                result.important_terms?.length ? `\n\nImportant Terms:\n${result.important_terms.map(t => `${t.term}: ${t.definition}`).join("\n")}` : "",
                result.study_tips?.length ? `\n\nStudy Tips:\n${result.study_tips.map(t => `• ${t}`).join("\n")}` : "",
              ].filter(Boolean).join(""))}
              className="h-7 w-7 p-0"
              aria-label="Copy summary"
            >
              <Copy size={14} className="text-slate-400" />
            </Button>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{result.summary}</p>
        </Card>
        {result.key_concepts?.length > 0 && (
          <Card accent="amber" variant="elevated">
            <SectionTitle color="text-amber-400">Key Concepts</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {result.key_concepts.map((concept, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-300 hover:border-amber-400/40 hover:text-amber-300 transition-colors cursor-default"
                >
                  {concept}
                </span>
              ))}
            </div>
          </Card>
        )}
        {result.important_terms?.length > 0 && (
          <Card accent="violet" variant="elevated">
            <SectionTitle color="text-violet-400">Important Terms</SectionTitle>
            <div className="divide-y divide-slate-800">
              {result.important_terms.map((term, i) => (
                <li key={i} className="py-3 flex gap-4 items-start">
                  <span className="text-violet-300 font-mono text-xs font-semibold min-w-[130px] pt-0.5">
                    {term.term}
                  </span>
                  <span className="text-slate-300 text-sm">{term.definition}</span>
                </li>
              ))}
            </div>
          </Card>
        )}
        {result.study_tips?.length > 0 && (
          <Card accent="amber" variant="elevated">
            <SectionTitle color="text-amber-400">Study Tips</SectionTitle>
            <ul className="space-y-2">
              {result.study_tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="text-amber-400 font-bold flex-shrink-0 mt-0.5">✦</span>
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  }

  if (type === "quiz") {
    const questions = result.questions || [];
    const score = submitted ? questions.filter((q) => answers[q.id] === q.answer).length : 0;
    const answeredCount = Object.keys(answers).length;

    return (
      <div>
        {submitted && questions.length > 0 && (
          <ScoreCard score={score} total={questions.length} onRetry={onRetryQuiz} />
        )}
        {questions.map((q, qi) => {
          const userAns = answers[q.id];
          const isCorrect = userAns === q.answer;

          return (
            <Card
              key={q.id}
              variant={submitted ? (isCorrect ? "elevated" : "elevated") : "default"}
              accent={submitted ? (isCorrect ? "emerald" : "rose") : undefined}
              className={`${submitted && isCorrect ? "animate-fade-up" : ""}`}
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="font-mono text-xs text-slate-400 bg-slate-850/80 border border-slate-800 rounded-lg px-2.5 py-1.5 flex-shrink-0 mt-0.5 shadow-inner">
                  Q{qi + 1}
                </span>
                <p className="text-white font-semibold text-sm leading-relaxed mt-1 flex-1">{q.question}</p>
                {submitted && (
                  <div className="ml-auto flex-shrink-0 mt-1">
                    {isCorrect ? (
                      <CheckCircle className="text-emerald-400" size={20} />
                    ) : (
                      <XCircle className="text-rose-400" size={20} />
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 ml-12">
                {q.options.map((option) => {
                  const isSelected = userAns === option;
                  const isCorrectOpt = submitted && option === q.answer;
                  const isWrongSelected = submitted && isSelected && option !== q.answer;

                  return (
                    <button
                      key={option}
                      onClick={() => onSelectAnswer(q.id, option)}
                      disabled={submitted}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all duration-200
                        ${
                          isCorrectOpt
                            ? "border-emerald-500/40 bg-emerald-550/10 text-emerald-350 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                            : isWrongSelected
                            ? "border-rose-500/40 bg-rose-550/10 text-rose-350 shadow-[0_0_15px_rgba(244,63,94,0.05)]"
                            : isSelected
                            ? "border-violet-500/40 bg-violet-550/10 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.05)]"
                            : "border-slate-800/80 bg-slate-900/40 text-slate-350 hover:border-slate-700 hover:bg-slate-800/50"
                        }
                        ${submitted ? "cursor-default" : "cursor-pointer transform hover:-translate-y-[1px] hover:shadow-sm"}`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isCorrectOpt ? "border-emerald-500 bg-emerald-500" :
                          isWrongSelected ? "border-rose-500 bg-rose-500" :
                          isSelected ? "border-violet-500 bg-violet-500" :
                          "border-slate-700"
                        }`}>
                          {isCorrectOpt || isWrongSelected ? (
                            <CheckCircle className="w-3 h-3 text-white" />
                          ) : isSelected ? (
                            <span className="w-2 h-2 rounded-full bg-white" />
                          ) : null}
                        </span>
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div className="ml-12 mt-4 p-4 bg-slate-950/60 border border-slate-850/80 rounded-xl text-xs text-slate-300 leading-relaxed shadow-inner">
                  <span className="text-amber-400 font-semibold">💡 Explanation: </span>
                  {q.explanation}
                </div>
              )}
            </Card>
          );
        })}

        {questions.length > 0 && !submitted && (
          <div className="flex items-center gap-4 mt-4 animate-fade-up">
            <Button onClick={() => onSubmitQuiz(questions)} size="md">
              Submit Quiz ({answeredCount}/{questions.length})
            </Button>
            <span className="text-slate-500 text-xs font-mono">
              {questions.length - answeredCount} remaining
            </span>
          </div>
        )}
      </div>
    );
  }

  if (type === "flashcards") {
    const cards = result.flashcards || [];

    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 animate-fade-up">
          <span className="text-slate-500 text-xs font-mono">{cards.length} cards · click or press Space to flip</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onExportCSV}>
              <Download size={13} />
              Export CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={onResetCards}>
              <RotateCcw size={13} />
              Reset All
            </Button>
          </div>
        </div>
        <div key={deckKey} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card, i) => (
            <div key={card.id} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
              <Flashcard card={card} index={i} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // chat — single saved reply (history view)
  return (
    <Card accent="rose" variant="elevated">
      <div className="flex items-center justify-between mb-3">
        <SectionTitle color="text-rose-400">Reply</SectionTitle>
        <Button variant="ghost" size="sm" onClick={() => {
          if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(result.reply);
            window.speechSynthesis.speak(utterance);
          }
        }} className="h-7 w-7 p-0" aria-label="Read aloud" title="Read aloud">
          <Volume2 size={14} />
        </Button>
      </div>
      <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{result.reply}</p>
    </Card>
  );
}

export default function AllPage() {
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
  const queryClient = useQueryClient();
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

  const { mutate, isPending: loading } = useMutation({
    mutationFn: (vars) => generateAll(vars.topic, vars.type, vars.options),
    onSuccess: (data, vars) => {
      // Store a normalized active object so ResultView can render any tool from
      // the same shape, whether freshly generated or reopened from history.
      setActive({ type: vars.type, topic: vars.topic, result: data });
      setAnswers({});
      setSubmitted(false);
      queryClient.invalidateQueries({ queryKey: ["generations"] });
      toast.success("Generated & saved to history!");
    },
    onError: (err) => toast.error(err.message || "Generation failed. Try again."),
  });

  const { mutate: sendChatMsg, isPending: chatLoading } = useMutation({
    mutationFn: (vars) => generateAll(vars.msg, "chat", { history: vars.history }),
    onSuccess: (data) => {
      setChatTurns((t) => [...t, { role: "assistant", content: data.reply }]);
      queryClient.invalidateQueries({ queryKey: ["generations"] });
      refreshChatSessions();
    },
    onError: (err) => toast.error(err.message || "Message failed."),
  });

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [chatTurns, chatLoading]);

  function optionsFor() {
    // Convert the currently visible control values into backend option names.
    if (type === "explain") return { level };
    if (type === "summarize") return { format };
    if (type === "quiz") return { num_questions: parseInt(numQ), difficulty };
    if (type === "flashcards") return { num_cards: parseInt(numCards) };
    return {};
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

  return (
    <div>
      <PageHeader
        icon="🗂️"
        title="All-in-One Studio"
        subtitle="Every tool with its full options — interactive results, saved history"
      />

      {/* ── Topic + per-type option controls ── */}
      <Card variant="elevated" className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            label="Topic or Question"
            aria-label="Topic"
            placeholder={type === "chat" ? "What would you like to chat about?" : "e.g. Photosynthesis, The French Revolution, your study notes..."}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            className="flex-1"
            leftIcon={<Sparkles className="w-4 h-4" />}
            hint={type === "summarize" ? `${topic.length} characters${topic.length > 0 && topic.length < 30 ? " — need at least 30" : ""}` : type === "chat" ? "Topic context for chat history" : "Any topic, concept, or study material"}
            error={type === "summarize" && topic.length > 0 && topic.length < 30 ? "Topic too short — add more content" : undefined}
          />
          {type === "explain" && (
            <Select
              label="Level"
              aria-label="Level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="sm:w-40"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          )}
          {type === "summarize" && (
            <Select
              label="Format"
              aria-label="Format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="sm:w-40"
            >
              <option value="bullets">Bullets</option>
              <option value="paragraph">Paragraph</option>
              <option value="outline">Outline</option>
            </Select>
          )}
          {type === "quiz" && (
            <>
              <Select
                label="Questions"
                aria-label="Questions"
                value={numQ}
                onChange={(e) => setNumQ(e.target.value)}
                className="sm:w-32"
              >
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="8">8</option>
              </Select>
              <Select
                label="Difficulty"
                aria-label="Difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="sm:w-36"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
            </>
          )}
          {type === "flashcards" && (
            <Select
              label="Number of Cards"
              aria-label="Number of cards"
              value={numCards}
              onChange={(e) => setNumCards(e.target.value)}
              className="sm:w-40"
            >
              <option value="5">5 cards</option>
              <option value="8">8 cards</option>
              <option value="10">10 cards</option>
              <option value="15">15 cards</option>
            </Select>
          )}
          <Select
            label="Tool Type"
            aria-label="Tool type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="sm:w-40"
          >
            {TOOL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-4">
          <Button onClick={handleGenerate} loading={loading} disabled={!topic.trim() || (type === "summarize" && topic.trim().length < 30)} size="lg">
            <ArrowRight size={16} />
            {type === "chat" ? "Start Chat" : "Generate"}
          </Button>
        </div>
      </Card>

      {/* ── Chat conversation panel (shown when chat is selected) ── */}
      {type === "chat" && (
        <div className="mb-6 space-y-4">
          {/* Chat sessions list */}
          <Card variant="elevated">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-slate-500" />
                <span className="text-slate-500 text-xs font-mono uppercase tracking-wider">Chat Sessions</span>
              </div>
              <Button variant="secondary" size="sm" onClick={startNewChatSession}>
                <Plus size={14} />
                New Chat
              </Button>
            </div>
            {chatSessions.length === 0 ? (
              <p className="text-slate-600 text-xs">No saved chats yet. Start a conversation above.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => openChatSession(session.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      activeChatSessionId === session.id
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
                    }`}
                  >
                    <MessageSquare size={12} className="flex-shrink-0" />
                    <span className="text-sm truncate flex-1">{session.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChatSessionHandler(session.id);
                      }}
                      className="p-1 rounded hover:bg-slate-700 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Chat panel - only show when chat has started */}
          {chatStarted && (
            <Card variant="elevated">
              <div className="h-[420px] flex flex-col">
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {chatTurns.map((m, i) => (
                    <ChatBubble key={i} msg={m} />
                  ))}
                  {chatLoading && <ChatTyping />}
                  <div ref={chatBottomRef} />
                </div>
                <div className="border-t border-slate-800 px-4 py-3">
                  <div className="flex gap-2 items-center">
                    <Input
                      type="text"
                      aria-label="Chat message"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value.slice(0, 2000))}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleChatSend()}
                      placeholder="Ask a question, request an explanation..."
                      className="flex-1"
                      leftIcon={<MessageSquare className="w-4 h-4" />}
                      disabled={chatLoading}
                    />
                    <Button onClick={handleChatSend} loading={chatLoading} disabled={!chatInput.trim()} size="md">
                      <Send size={15} />
                    </Button>
                  </div>
                  <p className="text-slate-700 text-xs mt-1.5 ml-1">Press Enter to send • Shift+Enter for new line</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <Card variant="elevated">
          <LoadingSkeleton lines={4} message="Generating..." variant="card" />
        </Card>
      )}

      {/* Result */}
      {active && !loading && (
        <div className="animate-fade-up">
          <div className="flex items-center gap-3 mb-4">
            <TypeBadge type={active.type} />
            <span className="text-slate-500 text-xs font-mono truncate">{active.topic}</span>
          </div>
          <ResultView
            active={active}
            answers={answers}
            submitted={submitted}
            onSelectAnswer={handleSelectAnswer}
            onSubmitQuiz={handleSubmitQuiz}
            onRetryQuiz={() => {
              setAnswers({});
              setSubmitted(false);
            }}
            onExportCSV={handleExportCSV}
            onResetCards={() => setDeckKey((k) => k + 1)}
            deckKey={deckKey}
          />
        </div>
      )}

      {/* Saved history */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <History className="text-slate-500" size={16} />
          <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">
            Saved Generations
          </span>
        </div>
        {historyLoading ? (
          <Card variant="elevated">
            <LoadingSkeleton lines={3} message="Loading history..." variant="card" />
          </Card>
        ) : !history || history.length === 0 ? (
          <Card variant="outlined" className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4 border border-slate-800">
              <History className="text-slate-500" size={28} />
            </div>
            <p className="text-slate-400 text-sm font-medium mb-1">No saved generations yet</p>
            <p className="text-slate-600 text-xs font-light max-w-xs mx-auto">
              Generate something above and it will show up here automatically.
            </p>
          </Card>
        ) : (
          <>
            {/* Tab navbar */}
            <div className="flex gap-1 p-1 bg-slate-900/50 rounded-xl mb-4 border border-slate-800/50 overflow-x-auto">
              {[
                { key: "all", label: "All" },
                ...TOOL_OPTIONS.map((o) => ({ key: o.value, label: o.label })),
              ].map((tab) => {
                const count = tab.key === "all"
                  ? history.length
                  : history.filter((h) => h.type === tab.key).length;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setHistoryTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      historyTab === tab.key
                        ? "bg-slate-800 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    {tab.label}
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      historyTab === tab.key ? "bg-slate-700 text-slate-300" : "bg-slate-800 text-slate-600"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filtered history list */}
            <div className="space-y-2">
              {history
                .filter((item) => historyTab === "all" || item.type === historyTab)
                .map((item, index) => (
                  <Card
                    key={item.id}
                    variant={active?.result === item.result ? "elevated" : "default"}
                    hover
                    onClick={() => {
                      setActive({ type: item.type, topic: item.topic, result: item.result });
                      setAnswers({});
                      setSubmitted(false);
                    }}
                    className={`transition-all duration-200 ${
                      active?.result === item.result ? "border-fuchsia-400/40 bg-slate-800 shadow-[0_0_20px_rgba(217,70,239,0.05)]" : ""
                    }`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <TypeBadge type={item.type} />
                      <span className="text-slate-300 text-sm truncate flex-1">{item.topic}</span>
                      <span className="text-slate-600 text-xs font-mono flex-shrink-0 hidden sm:inline">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <RotateCcw size={14} className="text-slate-600 flex-shrink-0" />
                    </div>
                  </Card>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
