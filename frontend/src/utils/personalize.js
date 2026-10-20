/**
 * Pure helpers that turn stored activity into the personalized home surface.
 *
 * Everything here is derived from data the API already returns (generations,
 * chat sessions, documents, usage totals) — no invented metrics. Each function
 * takes `now` explicitly so it can be tested against a fixed clock.
 */

export const TOOL_LABELS = {
  explain: "Explain",
  summarize: "Summarize",
  quiz: "Quiz",
  flashcards: "Flashcards",
  chat: "AI Tutor",
};

export const TOOL_ROUTES = {
  explain: "/explain",
  summarize: "/summarize",
  quiz: "/quiz",
  flashcards: "/flashcards",
  chat: "/chat",
  all: "/all",
};

const MS_PER_DAY = 86400000;

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Sort ISO timestamps newest-first, dropping anything unparseable. */
function sortedDates(rows, field = "created_at") {
  return (rows || [])
    .map((row) => toDate(row?.[field]))
    .filter(Boolean)
    .sort((a, b) => b - a);
}

/** "2026-10-18" in local time — the unit streaks and sparklines count by. */
export function dayKey(date) {
  const d = toDate(date);
  if (!d) return null;
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function greetingFor(now = new Date()) {
  const hour = toDate(now)?.getHours() ?? 0;
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Late session";
}

export function dateLabel(now = new Date()) {
  const d = toDate(now);
  if (!d) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Human age of a timestamp: "just now" → "5 min ago" → "Yesterday" → "12 Oct". */
export function relativeTime(value, now = new Date()) {
  const then = toDate(value);
  const anchor = toDate(now);
  if (!then || !anchor) return "";
  const diffMs = anchor - then;
  if (diffMs < 0) return "just now";

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24 && dayKey(then) === dayKey(anchor)) return `${hours} h ago`;
  if (dayKey(then) === dayKey(new Date(anchor - MS_PER_DAY))) return "Yesterday";

  return then.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * Consecutive days with activity, counting back from today. A gap only breaks
 * the streak once a full day has passed with nothing saved, so studying
 * yesterday and opening the app this morning still reads as a live streak.
 */
export function computeStreak(rows, now = new Date(), field = "created_at") {
  const anchor = toDate(now);
  if (!anchor) return 0;

  const days = new Set(sortedDates(rows, field).map(dayKey));
  if (!days.size) return 0;

  // Today may legitimately be empty if the student has not generated anything
  // yet — the streak then continues from yesterday rather than resetting to 0.
  let cursor = new Date(anchor);
  if (!days.has(dayKey(cursor))) {
    cursor = new Date(anchor - MS_PER_DAY);
    if (!days.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor - MS_PER_DAY);
  }
  return streak;
}

/** Last `days` days of counts, oldest first, for the sparkline. */
export function activitySeries(rows, days = 14, now = new Date(), field = "created_at") {
  const anchor = toDate(now);
  if (!anchor) return [];

  const counts = new Map();
  for (const date of sortedDates(rows, field)) {
    const key = dayKey(date);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const series = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(anchor - offset * MS_PER_DAY);
    series.push({
      key: dayKey(date),
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      day: date.getDate(),
      count: counts.get(dayKey(date)) || 0,
      isToday: offset === 0,
    });
  }
  return series;
}

/** Count of rows created today, for the "N saved today" line. */
export function countToday(rows, now = new Date(), field = "created_at") {
  const key = dayKey(now);
  return sortedDates(rows, field).filter((date) => dayKey(date) === key).length;
}

/** Count of rows created in the last 7 days, oldest-first friendly. */
export function countLastDays(rows, span = 7, now = new Date(), field = "created_at") {
  const anchor = toDate(now);
  if (!anchor) return 0;
  const cutoff = anchor - span * MS_PER_DAY;
  return sortedDates(rows, field).filter((date) => date >= cutoff).length;
}

/** Per-tool histogram with share of total, most used first. */
export function toolMix(rows) {
  const counts = new Map();
  let total = 0;
  for (const row of rows || []) {
    const type = row?.type;
    if (!type) continue;
    counts.set(type, (counts.get(type) || 0) + 1);
    total += 1;
  }
  return [...counts.entries()]
    .map(([type, count]) => ({
      type,
      label: TOOL_LABELS[type] || type,
      route: TOOL_ROUTES[type] || "/all",
      count,
      pct: total ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function mostUsedTool(rows) {
  const mix = toolMix(rows);
  return mix.length ? mix[0] : null;
}

/**
 * Route a typed study intent to the tool that fits it best.
 * Keyword-driven on purpose: it has to be instant and explainable, and a wrong
 * guess is one click away from being corrected.
 */
export function routeIntent(text) {
  const query = (text || "").trim().toLowerCase();
  if (!query) return null;

  const has = (...needles) => needles.some((needle) => query.includes(needle));

  if (has("quiz", "test me", "mcq", "multiple choice", "practice question")) {
    return { tool: "quiz", route: TOOL_ROUTES.quiz, label: "Quiz", reason: "sounds like a self-test" };
  }
  if (has("flashcard", "flash card", "anki", "memorise", "memorize", "revision card")) {
    return { tool: "flashcards", route: TOOL_ROUTES.flashcards, label: "Flashcards", reason: "best built as cards" };
  }
  if (has("summar", "tl;dr", "key points", "condense", "shorten")) {
    return { tool: "summarize", route: TOOL_ROUTES.summarize, label: "Summarize", reason: "you want it condensed" };
  }
  if (has("my notes", "my document", "my pdf", "uploaded", "in my file", "ask my docs")) {
    return { tool: "chat", route: TOOL_ROUTES.chat, label: "Chat with my docs", reason: "grounded in your uploads" };
  }
  if (has("help me", "i'm stuck", "i am stuck", "tutor", "study plan", "coach", "explain it to me")) {
    return { tool: "chat", route: TOOL_ROUTES.chat, label: "AI Tutor", reason: "a conversation will get further" };
  }
  if (
    query.endsWith("?") ||
    has("what is", "what are", "why ", "how does", "how do", "explain", "define", "difference between")
  ) {
    return { tool: "explain", route: TOOL_ROUTES.explain, label: "Explain", reason: "a concept to break down" };
  }
  return { tool: "explain", route: TOOL_ROUTES.explain, label: "Explain", reason: "a good place to start" };
}

/**
 * Up to three concrete next actions inferred from what the student has already
 * done. Each carries the reason it was chosen so the UI can show its working.
 */
export function suggestNextSteps({ generations = [], sessions = [], documents = [] } = {}, now = new Date()) {
  // Do not assume the API's ordering — pick the newest row explicitly.
  const latest = (generations || []).reduce((best, row) => {
    const at = toDate(row?.created_at);
    if (!at) return best;
    if (!best || at > best._at) return { ...row, _at: at };
    return best;
  }, null);
  const recentSession = (sessions || []).reduce((best, row) => {
    const at = toDate(row?.updated_at || row?.created_at);
    if (!at) return best;
    if (!best || at > best._at) return { ...row, _at: at };
    return best;
  }, null);
  const readyDocs = (documents || []).filter((doc) => doc?.status === "ready");
  const usedTypes = new Set((generations || []).map((row) => row?.type).filter(Boolean));

  const topicSteps = [];
  if (latest?.topic) {
    const topic = String(latest.topic).slice(0, 60);
    if (!usedTypes.has("quiz")) {
      topicSteps.push({
        id: "quiz-from-last",
        title: `Turn "${topic}" into a 5-question quiz`,
        reason: "You explained it — testing recall is what makes it stick.",
        route: TOOL_ROUTES.quiz,
        accent: "violet",
      });
    }
    if (!usedTypes.has("flashcards")) {
      topicSteps.push({
        id: "cards-from-last",
        title: `Make flashcards from "${topic}"`,
        reason: "Export them to Anki and revise on the move.",
        route: TOOL_ROUTES.flashcards,
        accent: "sky",
      });
    }
    if (!usedTypes.has("summarize")) {
      topicSteps.push({
        id: "summarize-last",
        title: `Summarize "${topic}" into key points`,
        reason: "A one-page recap before the next session.",
        route: TOOL_ROUTES.summarize,
        accent: "emerald",
      });
    }
  }

  // Two is the most this group earns: three near-identical "reuse your last
  // topic" cards would crowd out the library and resume suggestions below.
  const steps = topicSteps.slice(0, 2);

  if (readyDocs.length) {
    const title = readyDocs[0].title || readyDocs[0].filename || "your upload";
    steps.push({
      id: "ground-in-docs",
      title: `Ground your next answer in "${title}"`,
      reason: `${readyDocs.length} document${readyDocs.length === 1 ? "" : "s"} indexed and ready to cite.`,
      route: TOOL_ROUTES.chat,
      accent: "teal",
    });
  }

  if (recentSession) {
    steps.push({
      id: "resume-chat",
      title: `Resume "${recentSession.title || "Untitled chat"}"`,
      reason: `Last active ${relativeTime(recentSession.updated_at || recentSession.created_at, now)}.`,
      route: TOOL_ROUTES.chat,
      accent: "rose",
    });
  }

  if (!steps.length) {
    steps.push({
      id: "first-explain",
      title: "Explain the first concept you are stuck on",
      reason: "Every tool starts from a topic — this one is the fastest.",
      route: TOOL_ROUTES.explain,
      accent: "amber",
    });
  }

  return steps.slice(0, 3);
}

/** Onboarding checklist computed from real rows, so ticks are earned not faked. */
export function onboardingChecklist({ generations = [], sessions = [], documents = [] } = {}) {
  const types = new Set((generations || []).map((row) => row?.type).filter(Boolean));
  return [
    {
      id: "first-generation",
      label: "Run your first AI tool",
      hint: "Explain, summarize, quiz or flashcards",
      done: (generations || []).length > 0,
      route: TOOL_ROUTES.explain,
    },
    {
      id: "upload-docs",
      label: "Upload a study document",
      hint: "PDF, TXT or MD — pick them under any tool's title",
      done: (documents || []).length > 0,
      route: TOOL_ROUTES.explain,
    },
    {
      id: "start-chat",
      label: "Ask the AI tutor something",
      hint: "Streaming answers, saved as a session",
      done: (sessions || []).length > 0 || types.has("chat"),
      route: TOOL_ROUTES.chat,
    },
    {
      id: "self-test",
      label: "Test yourself with a quiz",
      hint: "Recall beats re-reading",
      done: types.has("quiz") || types.has("flashcards"),
      route: TOOL_ROUTES.quiz,
    },
  ];
}

export function checklistProgress(items) {
  if (!items?.length) return 0;
  return Math.round((items.filter((item) => item.done).length / items.length) * 100);
}

/** Compact token counts: 1234 → "1.2K". */
export function formatCompactCount(value) {
  const n = Number(value) || 0;
  if (n < 1000) return String(n);
  if (n < 1000000) return `${(n / 1000).toFixed(n < 10000 ? 1 : 0)}K`;
  return `${(n / 1000000).toFixed(1)}M`;
}

/** Cost always shows 4 decimals at zero, matching the API's honest zero. */
export function formatCostUsd(value) {
  const n = Number(value) || 0;
  return n === 0 ? "$0.0000" : `$${n.toFixed(n < 1 ? 4 : 2)}`;
}
