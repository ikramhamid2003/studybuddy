import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import LoadingSkeleton from "../components/LoadingSkeleton";
import TypeBadge from "../components/shared/TypeBadge";
import DocumentPicker from "../components/shared/DocumentPicker";
import DocumentSources from "../components/shared/DocumentSources";
import GroundingNote from "../components/shared/GroundingNote";
import ToolControls from "../components/studio/ToolControls";
import ChatPanel from "../components/studio/ChatPanel";
import ResultView from "../components/studio/ResultView";
import HistoryList from "../components/studio/HistoryList";
import useStudio from "../hooks/useStudio";

export default function AllPage() {
  const s = useStudio();

  return (
    <div>
      <PageHeader
        icon="🗂️"
        title="All-in-One Studio"
        subtitle="Every tool with its full options — interactive results, saved history"
      />

      {/* ── Document grounding: upload button + document dropdown ── */}
      <DocumentPicker library={s.library} title={`Ground the ${s.type} in my documents`} />

      {/* ── Topic + per-type option controls ── */}
      <ToolControls
        type={s.type}
        onTypeChange={s.setType}
        topic={s.topic}
        onTopicChange={s.setTopic}
        level={s.level}
        onLevelChange={s.setLevel}
        format={s.format}
        onFormatChange={s.setFormat}
        numQ={s.numQ}
        onNumQChange={s.setNumQ}
        difficulty={s.difficulty}
        onDifficultyChange={s.setDifficulty}
        numCards={s.numCards}
        onNumCardsChange={s.setNumCards}
        loading={s.loading}
        onGenerate={s.handleGenerate}
      />

      <GroundingNote />

      {/* ── Chat conversation panel (shown when chat is selected) ── */}
      {s.type === "chat" && (
        <ChatPanel
          sessions={s.chatSessions}
          activeSessionId={s.activeChatSessionId}
          turns={s.chatTurns}
          started={s.chatStarted}
          input={s.chatInput}
          setInput={s.setChatInput}
          loading={s.chatLoading}
          bottomRef={s.chatBottomRef}
          onNewChat={s.startNewChatSession}
          onOpenSession={s.openChatSession}
          onDeleteSession={s.deleteChatSessionHandler}
          onSend={s.handleChatSend}
        />
      )}

      {/* Loading */}
      {s.loading && (
        <Card variant="elevated">
          <LoadingSkeleton lines={4} message="Generating..." variant="card" />
        </Card>
      )}

      {/* Result */}
      {s.active && !s.loading && (
        <div className="animate-fade-up">
          <div className="flex items-center gap-3 mb-4">
            <TypeBadge type={s.active.type} />
            <span className="text-slate-500 text-xs font-mono truncate">{s.active.topic}</span>
          </div>
          <ResultView
            active={s.active}
            answers={s.answers}
            submitted={s.submitted}
            onSelectAnswer={s.handleSelectAnswer}
            onSubmitQuiz={s.handleSubmitQuiz}
            onRetryQuiz={s.retryQuiz}
            onExportCSV={s.handleExportCSV}
            onResetCards={s.resetCards}
            deckKey={s.deckKey}
          />
          {/* Saved generations carry their sources too, so reopening from
              history still shows which documents grounded the answer. */}
          <DocumentSources sources={s.active.result?.sources} className="mt-4" />
        </div>
      )}

      {/* Saved history */}
      <HistoryList
        history={s.history}
        loading={s.historyLoading}
        selectedTab={s.historyTab}
        onTabChange={s.setHistoryTab}
        active={s.active}
        onOpen={s.openFromHistory}
        onDelete={s.deleteGenerationHandler}
      />
    </div>
  );
}
