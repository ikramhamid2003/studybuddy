import { Sparkles, ArrowRight } from "lucide-react";
import Card from "../Card";
import Button from "../Button";
import { Input, Select } from "../Input";
import { TOOL_OPTIONS } from "./studioConstants";

export default function ToolControls({
  type,
  onTypeChange,
  topic,
  onTopicChange,
  level,
  onLevelChange,
  format,
  onFormatChange,
  numQ,
  onNumQChange,
  difficulty,
  onDifficultyChange,
  numCards,
  onNumCardsChange,
  loading,
  onGenerate,
}) {
  return (
  <Card variant="elevated" className="mb-6">
    <div className="flex flex-col sm:flex-row gap-3">
      <Input
        label="Topic or Question"
        aria-label="Topic"
        placeholder={type === "chat" ? "What would you like to chat about?" : "e.g. Photosynthesis, The French Revolution, your study notes..."}
        value={topic}
        onChange={(e) => onTopicChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onGenerate()}
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
          onChange={(e) => onLevelChange(e.target.value)}
          className="sm:w-40"
          color="amber"
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
          onChange={(e) => onFormatChange(e.target.value)}
          className="sm:w-40"
          color="emerald"
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
            onChange={(e) => onNumQChange(e.target.value)}
            className="sm:w-32"
            color="violet"
          >
            <option value="3">3</option>
            <option value="5">5</option>
            <option value="8">8</option>
          </Select>
          <Select
            label="Difficulty"
            aria-label="Difficulty"
            value={difficulty}
            onChange={(e) => onDifficultyChange(e.target.value)}
            className="sm:w-36"
            color="violet"
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
          onChange={(e) => onNumCardsChange(e.target.value)}
          className="sm:w-40"
          color="sky"
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
        onChange={(e) => onTypeChange(e.target.value)}
        className="sm:w-40"
        color="rose"
      >
        {TOOL_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
    <div className="mt-4">
      <Button onClick={onGenerate} loading={loading} disabled={!topic.trim() || (type === "summarize" && topic.trim().length < 30)} size="lg">
        <ArrowRight size={16} />
        {type === "chat" ? "Start Chat" : "Generate"}
      </Button>
    </div>
  </Card>
  );
}
