import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Clock,
  Coins,
  FileSearch,
  FileText,
  Flame,
  Layers,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Target,
  Wand2,
  Zap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  fetchUsageStats,
  listChatSessions,
  listDocuments,
  listGenerations,
} from "../../utils/api";
import { stashPendingTopic } from "../../utils/pendingTopic";
import {
  TOOL_ROUTES,
  activitySeries,
  checklistProgress,
  computeStreak,
  countLastDays,
  countToday,
  dateLabel,
  formatCompactCount,
  formatCostUsd,
  greetingFor,
  mostUsedTool,
  onboardingChecklist,
  relativeTime,
  routeIntent,
  suggestNextSteps,
  toolMix,
} from "../../utils/personalize";
import Sparkline from "./Sparkline";
import ProgressRing from "./ProgressRing";

const TOOL_STYLES = {
  explain: { icon: BookOpen, text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", bar: "bg-amber-400" },
  summarize: { icon: FileText, text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", bar: "bg-emerald-400" },
  quiz: { icon: Zap, text: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", bar: "bg-violet-400" },
  flashcards: { icon: Layers, text: "text-sky-600", bg: "bg-sky-50", border: "border-sky-200", bar: "bg-sky-400" },
  chat: { icon: MessageSquare, text: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", bar: "bg-rose-400" },
};

const ACCENT_STYLES = {
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  teal: "border-teal-200 bg-teal-50 text-teal-700",
};

function styleFor(type) {
  return TOOL_STYLES[type] || { icon: Sparkles, text: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200", bar: "bg-indigo-400" };
}

function Skeleton({ className = "" }) {
  return <div className={`shimmer rounded-lg bg-slate-100 ${className}`} />;
}

function SectionCard({ title, action, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="font-display text-sm font-semibold tracking-tight text-slate-900">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

function StatTile({ icon: Icon, label, value, sub, tone = "indigo" }) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
  };
  return (
    <div className="lift-hover rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${tones[tone]}`}>
          <Icon size={15} />
        </div>
        {sub && <span className="text-[11px] font-medium text-slate-400">{sub}</span>}
      </div>
      <p className="font-display mt-3 text-2xl font-bold leading-none tracking-tight text-slate-900">{value}</p>
      <p className="mt-1.5 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

export default function HomeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const now = useMemo(() => new Date(), []);

  const queryOptions = { enabled: Boolean(user), staleTime: 60000, retry: false };
  const { data: generations, isLoading: loadingGenerations } = useQuery({
    queryKey: ["generations"],
    // Wrapped so react-query's context object never reaches `listGenerations`,
    // which would serialize it into a `?type=[object Object]` filter.
    queryFn: () => listGenerations(),
    ...queryOptions,
  });
  const { data: sessions } = useQuery({
    queryKey: ["chat_sessions"],
    queryFn: listChatSessions,
    ...queryOptions,
  });
  const { data: documents } = useQuery({
    queryKey: ["rag_documents"],
    queryFn: listDocuments,
    ...queryOptions,
  });
  const { data: usage } = useQuery({
    queryKey: ["usage_stats"],
    queryFn: fetchUsageStats,
    ...queryOptions,
  });

  const rows = generations || [];
  const chatSessions = sessions || [];
  const docs = documents || [];

  const intent = routeIntent(draft);
  const streak = computeStreak(rows, now);
  const series = activitySeries(rows, 14, now);
  const today = countToday(rows, now);
  const thisWeek = countLastDays(rows, 7, now);
  const lastWeek = countLastDays(rows, 14, now) - thisWeek;
  const mix = toolMix(rows);
  const favourite = mostUsedTool(rows);
  const checklist = onboardingChecklist({ generations: rows, sessions: chatSessions, documents: docs });
  const progress = checklistProgress(checklist);
  const nextSteps = suggestNextSteps({ generations: rows, sessions: chatSessions, documents: docs }, now);
  const latest = rows[0] || null;
  const latestStyle = styleFor(latest?.type);
  const LatestIcon = latestStyle.icon;
  const readyDocs = docs.filter((doc) => doc.status === "ready");

  const totalTokens = (usage?.total_input_tokens || 0) + (usage?.total_output_tokens || 0);

  // Daily budget: the backend sends the cap plus today's spend. A null/0 limit
  // means the cap is disabled, so the meter hides rather than showing "0 of 0".
  const dailyLimit = usage?.daily_token_limit || 0;
  const usedToday = usage?.tokens_used_today || 0;
  const budgetPct = dailyLimit > 0 ? Math.min(100, Math.round((usedToday / dailyLimit) * 100)) : 0;

  function openTool(route, topic) {
    // The topic travels with the navigation so the tool opens pre-filled.
    if (topic) stashPendingTopic(topic);
    navigate(route);
  }

  const weekDelta =
    lastWeek === 0
      ? thisWeek > 0
        ? "first week tracked"
        : "nothing yet"
      : `${thisWeek >= lastWeek ? "+" : ""}${thisWeek - lastWeek} vs last week`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      {/* ── Personalized hero ── */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-900/20 bg-indigo-950 shadow-elevated">
        <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-90" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0 bg-grid-pattern bg-grid opacity-40"
          aria-hidden="true"
        />
        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-indigo-200">
                <Sparkles size={13} className="text-indigo-300" />
                {dateLabel(now)}
              </p>
              <h1 className="font-display mt-2 break-words text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
                {greetingFor(now)}
                {user?.username ? <span className="text-indigo-200">, {user.username}</span> : null}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-indigo-100/80">
                {rows.length === 0
                  ? "Nothing saved yet — type what you are studying below and StudyBuddy picks the right tool for it."
                  : `${rows.length} saved ${rows.length === 1 ? "result" : "results"}${
                      favourite ? `, and ${favourite.label} is your most-used tool` : ""
                    }. Pick up below, or start something new.`}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 backdrop-blur-sm">
              <Flame size={17} className={streak > 0 ? "text-amber-300" : "text-indigo-300"} />
              <div className="leading-tight">
                <p className="font-display text-lg font-bold text-white">{streak}</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-indigo-200">
                  day {streak === 1 ? "streak" : "streak"}
                </p>
              </div>
            </div>
          </div>

          {/* Focus box */}
          <div className="mt-7 rounded-2xl border border-white/15 bg-white/10 p-1.5 backdrop-blur-md">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2.5 px-3">
                <Wand2 size={16} className="shrink-0 text-indigo-200" />
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && intent) openTool(intent.route, draft);
                  }}
                  placeholder="What are you studying today? Try “quiz me on photosynthesis”"
                  aria-label="What are you studying today?"
                  className="w-full bg-transparent py-3 text-sm text-white placeholder-indigo-200/60 outline-none"
                />
              </div>
              <button
                type="button"
                disabled={!intent}
                onClick={() => intent && openTool(intent.route, draft)}
                className="btn-primary shrink-0 justify-center rounded-xl px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                {intent ? intent.label : "Start"}
                <ArrowRight size={15} />
              </button>
            </div>
            {intent && (
              <p className="px-3 pb-1.5 text-[11px] text-indigo-200/80">
                Routes to <span className="font-semibold text-white">{intent.label}</span> — {intent.reason}. Your
                text arrives pre-filled.
              </p>
            )}
          </div>

          {/* Quick chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: "Explain a concept", route: "/explain", icon: Lightbulb },
              { label: "Build a quiz", route: "/quiz", icon: Target },
              { label: "Chat with my docs", route: "/chat", icon: FileSearch },
              { label: "Talk to the tutor", route: "/chat", icon: MessageSquare },
            ].map(({ label, route, icon: Icon }) => (
              <button
                key={route}
                type="button"
                onClick={() => openTool(route, draft)}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-indigo-100 transition-colors hover:border-white/30 hover:bg-white/15 hover:text-white motion-reduce:transition-none"
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Momentum strip ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Flame} tone="amber" label="Day streak" value={streak} sub={today ? `${today} today` : "nothing today"} />
        <StatTile icon={Clock} tone="indigo" label="Saved this week" value={thisWeek} sub={weekDelta} />
        <StatTile
          icon={Zap}
          tone="violet"
          label="Tokens used"
          value={loadingGenerations && !usage ? "—" : formatCompactCount(totalTokens)}
          sub={usage ? `${formatCompactCount(usage.total_output_tokens)} out` : undefined}
        />
        <StatTile icon={Coins} tone="emerald" label="Estimated cost" value={usage ? formatCostUsd(usage.total_estimated_cost) : "—"} sub="provider-priced" />
      </div>

      {dailyLimit > 0 && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Zap size={13} className="text-violet-500" /> Daily token budget
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {formatCompactCount(usedToday)} of {formatCompactCount(dailyLimit)} used
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${budgetPct >= 100 ? "bg-rose-500" : budgetPct >= 80 ? "bg-amber-500" : "bg-violet-500"}`}
              style={{ width: `${Math.max(budgetPct, usedToday > 0 ? 3 : 0)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            {budgetPct >= 100
              ? "Budget spent — tools pause until midnight."
              : `${formatCompactCount(usage.tokens_remaining_today)} tokens left today.`}
          </p>
        </div>
      )}

      {/* ── Continue + checklist ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Your last 14 days"
          action={
            <button
              type="button"
              onClick={() => navigate("/all")}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              All history <ChevronRight size={13} />
            </button>
          }
        >
          {loadingGenerations ? (
            <Skeleton className="h-[56px] w-full" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500">
              Your activity chart fills in as soon as you save your first result.
            </p>
          ) : (
            <>
              <Sparkline series={series} />
              {latest && (
                <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${latestStyle.bg} ${latestStyle.border}`}
                  >
                    <LatestIcon size={16} className={latestStyle.text} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Continue where you left off
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {latest.topic || "Untitled"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {latest.type} · {relativeTime(latest.created_at, now)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openTool(TOOL_ROUTES[latest.type] || "/all", latest.topic)}
                    className="btn-secondary shrink-0 rounded-lg px-3 py-2 text-xs"
                  >
                    Open again <ArrowUpRight size={13} />
                  </button>
                </div>
              )}
            </>
          )}
        </SectionCard>

        <SectionCard title={progress === 100 ? "All set up" : "Get set up"}>
          <div className="flex items-center gap-4">
            <ProgressRing progress={progress} label={progress === 100 ? "done" : "setup"} />
            <p className="text-xs leading-relaxed text-slate-500">
              {progress === 100
                ? "You have used every part of the workspace. The suggestions below now follow your own history."
                : `${checklist.filter((item) => item.done).length} of ${checklist.length} done — each tick comes from something you actually saved.`}
            </p>
          </div>
          <ul className="mt-4 space-y-1.5">
            {checklist.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(item.route)}
                  disabled={item.done}
                  className={`flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors motion-reduce:transition-none ${
                    item.done
                      ? "cursor-default border-emerald-100 bg-emerald-50/60"
                      : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold ${
                      item.done ? "border-emerald-400 bg-emerald-500 text-white" : "border-slate-300 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-xs font-semibold ${item.done ? "text-emerald-800" : "text-slate-800"}`}>
                      {item.label}
                    </span>
                    <span className="block text-[11px] leading-snug text-slate-500">{item.hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* ── Suggestions + tool mix ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-3">
          {nextSteps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => navigate(step.route)}
              className="lift-hover group flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"
            >
              <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${ACCENT_STYLES[step.accent] || ACCENT_STYLES.amber}`}>
                <Sparkles size={11} />
                Suggested
              </span>
              {/* break-words: titles embed saved topics, which can be one long unbroken token (a URL). */}
              <span className="mt-3 block break-words text-sm font-semibold leading-snug text-slate-900">{step.title}</span>
              <span className="mt-1.5 block flex-1 text-xs leading-relaxed text-slate-500">{step.reason}</span>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-800">
                Open <ArrowRight size={13} />
              </span>
            </button>
          ))}
        </div>

        <SectionCard title="Your tool mix">
          {mix.length === 0 ? (
            <p className="text-sm text-slate-500">No generations yet — your mix appears here once you save one.</p>
          ) : (
            <ul className="space-y-3">
              {mix.map((entry) => {
                const style = styleFor(entry.type);
                const Icon = style.icon;
                return (
                  <li key={entry.type}>
                    <button
                      type="button"
                      onClick={() => navigate(entry.route)}
                      className="group w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-700 group-hover:text-slate-900">
                          <Icon size={13} className={style.text} />
                          {entry.label}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {entry.count} · {entry.pct}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${style.bar} transition-[width] duration-700 ease-out motion-reduce:transition-none`}
                          style={{ width: `${Math.max(entry.pct, 3)}%` }}
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* ── Sessions + library ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Recent conversations"
          action={
            <button
              type="button"
              onClick={() => navigate("/chat")}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Open tutor <ChevronRight size={13} />
            </button>
          }
        >
          {chatSessions.length === 0 ? (
            <p className="text-sm text-slate-500">
              No saved conversations yet. The tutor keeps every chat, so you can pick one back up later.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {chatSessions.slice(0, 4).map((session) => (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => navigate("/chat")}
                    className="flex w-full items-center gap-3 py-2.5 text-left"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50">
                      <MessageSquare size={14} className="text-rose-600" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {session.title || "Untitled chat"}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {relativeTime(session.updated_at || session.created_at, now)}
                      </span>
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-slate-300" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Document library"
          action={
            <button
              type="button"
              onClick={() => navigate("/chat")}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Chat with my docs <ChevronRight size={13} />
            </button>
          }
        >
          {docs.length === 0 ? (
            <p className="text-sm text-slate-500">
              Upload a PDF, TXT or MD file and every tool can ground its answer in it, with citations.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {docs.slice(0, 4).map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-200 bg-teal-50">
                    <FileSearch size={14} className="text-teal-600" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {doc.title || doc.filename}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {doc.chunk_count ? `${doc.chunk_count} chunks · ` : ""}
                      {relativeTime(doc.created_at, now)}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      doc.status === "ready"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : doc.status === "error"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {doc.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {readyDocs.length > 0 && (
            <p className="mt-3 rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2 text-[11px] leading-relaxed text-teal-800">
              {readyDocs.length} ready {readyDocs.length === 1 ? "document" : "documents"} — tick them in any
              tool's <span className="font-semibold">My documents</span> dropdown to ground that generation.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
