import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  FileText,
  Layers,
  MessageSquare,
  Sparkles,
  Zap,
  History,
  RotateCcw,
  ArrowRight,
  Send,
  Bot,
  User,
  Volume2,
  Square,
  CheckCircle,
  XCircle,
  Trophy,
  Download,
  Eye,
  Copy,
  Check as CheckIcon,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input, Select } from "../components/Input";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { generateAll, listGenerations } from "../utils/api";

const TOOL_OPTIONS = [
  {
    value: "explain",
    label: "Explain",
    icon: BookOpen,
    badge: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  },
  {
    value: "summarize",
    label: "Summarize",
    icon: FileText,
    badge: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  },
  {
    value: "quiz",
    label: "Quiz",
    icon: Zap,
    badge: "text-violet-400 bg-violet-400/10 border-violet-400/30",
  },
  {
    value: "flashcards",
    label: "Flashcards",
    icon: Layers,
    badge: "text-sky-400 bg-sky-400/10 border-sky-400/30",
  },
  {
    value: "chat",
    label: "Chat",
    icon: MessageSquare,
    badge: "text-rose-400 bg-rose-400/10 border-rose-400/30",
  },
];

function SectionTitle({ color, children }) {
  // Small repeated heading used inside every result card.
  return (
    <div className={`text-xs font-mono uppercase tracking-widest mb-3 ${color}`}>
      {children}
    </div>
  );
}

function TypeBadge({ type }) {
  // History rows and result headers share this badge for quick tool scanning.
  const option = TOOL_OPTIONS.find((o) => o.value === type);
  const Icon = option ? option.icon : Sparkles;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-full border flex-shrink-0 ${
        option ? option.badge : "text-slate-400 bg-slate-800 border-slate-700"
      }`}
    >
      <Icon size={12} />
      {option ? option.label : type}
    </span>
  );
}

function Flashcard({ card, index }) {
  // Individual cards manage their own flip state; deck reset remounts them.
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => setFlipped((f) => !f);
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleFlip();
    }
  };

  return (
    <div
      className="flashcard-scene h-48 cursor-pointer group"
      onClick={handleFlip}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={flipped ? "Show question" : "Show answer"}
      aria-pressed={flipped}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={`flashcard-inner ${flipped ? "flipped" : ""}`}>
        <div className="flashcard-face backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center p-6 text-center hover:border-sky-500/40 hover:shadow-[0_0_25px_rgba(14,165,233,0.12)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
          <span className="text-sky-400/80 text-[10px] font-mono uppercase tracking-widest mb-3">
            Question
          </span>
          <p className="text-white text-sm font-semibold leading-relaxed">{card.front}</p>
          {card.hint && (
            <p className="text-slate-500 text-xs mt-3 italic font-light">Hint: {card.hint}</p>
          )}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye size={14} className="text-sky-400 animate-pulse" />
          </div>
        </div>
        <div className="flashcard-face flashcard-back-face backdrop-blur-md bg-slate-850/80 border border-emerald-500/30 rounded-2xl flex flex-col items-center justify-center p-6 text-center shadow-[0_0_25px_rgba(16,185,129,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
          <span className="text-emerald-400/80 text-[10px] font-mono uppercase tracking-widest mb-3">
            Answer
          </span>
          <p className="text-emerald-100 text-sm font-semibold leading-relaxed">
            {card.back}
          </p>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ score, total, onRetry }) {
  // Score color and progress bar are derived from the final percentage.
  const pct = Math.round((score / total) * 100);
  const color =
    pct >= 80 ? "text-emerald-450 font-black" : pct >= 50 ? "text-amber-450 font-semibold" : "text-rose-450";
  const barColor =
    pct >= 80
      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
      : pct >= 50
      ? "bg-gradient-to-r from-amber-500 to-amber-400"
      : "bg-gradient-to-r from-rose-500 to-rose-400";
  const message = pct >= 80 ? "Excellent work! 🎉" : pct >= 50 ? "Good effort! 📚" : "Keep studying! 💪";

  return (
    <Card variant="elevated" accent={pct >= 80 ? "emerald" : pct >= 50 ? "amber" : "rose"} className="text-center animate-fade-up">
      <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-bounce" />
      <div className={`font-display text-6xl mb-1 ${color}`}>{pct}%</div>
      <p className="text-slate-400 text-sm mb-1">
        {score} / {total} correct
      </p>
      <p className="text-slate-200 font-medium mb-5">{message}</p>
      <div className="w-full h-2.5 bg-slate-950/60 rounded-full overflow-hidden mb-5 mx-auto max-w-xs border border-slate-800">
        <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <Button onClick={onRetry} variant="secondary">
        <RotateCcw size={15} className="mr-1.5" />
        Try Again
      </Button>
    </Card>
  );
}

function ChatBubble({ msg }) {
  // The same bubble component handles user and assistant layout variants.
  const isUser = msg.role === "user";
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const utteranceRef = useRef(null);

  function toggleSpeech(text) {
    if (!("speechSynthesis" in window)) {
      return toast.error("Text-to-speech is not supported in this browser.");
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-fade-up`}>
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm border
          ${isUser ? "bg-rose-500 border-rose-400/20" : "bg-slate-900/60 border-slate-800/80"}`}
      >
        {isUser ? <User size={15} className="text-white" /> : <Bot size={15} className="text-rose-400" />}
      </div>
      <div className="flex flex-col gap-1 max-w-[78%] relative">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
            ${
              isUser
                ? "bg-gradient-to-r from-rose-500 to-rose-450 text-white font-medium rounded-tr-sm shadow-[0_4px_15px_rgba(244,63,94,0.12)]"
                : "backdrop-blur-md bg-slate-900/40 text-slate-200 border border-slate-800/80 rounded-tl-sm whitespace-pre-wrap"
            }`}
        >
          {msg.content}
        </div>
        {!isUser && msg.content && (
          <div className="flex items-center justify-start gap-1.5 ml-1 mt-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSpeech(msg.content)}
              className={`h-7 w-7 p-0 transition-colors ${isSpeaking ? 'text-rose-400 animate-pulse' : 'text-slate-500 hover:text-rose-400'}`}
              title={isSpeaking ? "Stop reading" : "Read aloud"}
              aria-label={isSpeaking ? "Stop reading" : "Read aloud"}
            >
              {isSpeaking ? <Square size={13} fill="currentColor" /> : <Volume2 size={14} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 w-7 p-0 text-slate-500 hover:text-amber-400 transition-colors"
              title={copied ? "Copied!" : "Copy message"}
              aria-label={copied ? "Copied!" : "Copy message"}
            >
              {copied ? <CheckIcon className="text-emerald-400" size={14} /> : <Copy size={14} />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

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
        }} className="h-7 w-7 p-0" aria-label="Read aloud">
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
  const queryClient = useQueryClient();
  const chatBottomRef = useRef(null);

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
    mutate({ topic: topic.trim(), type, options: optionsFor() });
  }

  function handleChatSend() {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput("");
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

      {type === "chat" ? (
        /* ── Chat conversation panel ── */
        <Card variant="elevated" className="mb-6">
          <div className="h-[420px] flex flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {chatTurns.length === 0 && (
                <Card variant="outlined" className="mx-4 mt-8 text-center py-8">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/60 flex items-center justify-center mx-auto mb-3 border border-slate-800">
                    <MessageSquare className="text-slate-500" size={24} />
                  </div>
                  <p className="text-slate-400 text-sm font-medium mb-1">No messages yet</p>
                  <p className="text-slate-600 text-xs font-light max-w-xs mx-auto">
                    Ask anything — every reply is saved to your history too.
                  </p>
                </Card>
              )}
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
      ) : (
        /* ── Topic + per-type option controls ── */
        <Card variant="elevated" className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              label="Topic or Question"
              aria-label="Topic"
              placeholder="e.g. Photosynthesis, The French Revolution, your study notes..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              className="flex-1"
              leftIcon={<Sparkles className="w-4 h-4" />}
              hint="Any topic, concept, or study material"
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
            <Button onClick={handleGenerate} loading={loading} disabled={!topic.trim()} size="lg">
              <ArrowRight size={16} />
              Generate
            </Button>
          </div>
        </Card>
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
          <div className="space-y-2">
            {history.map((item, index) => (
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
        )}
      </div>
    </div>
  );
}
