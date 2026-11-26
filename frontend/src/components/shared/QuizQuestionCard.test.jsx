import { render, screen, fireEvent } from "@testing-library/react";
import QuizQuestionCard from "./QuizQuestionCard";

const question = {
  id: "q1",
  question: "Which planet is known as the Red Planet?",
  options: ["Venus", "Mars", "Jupiter"],
  answer: "Mars",
  explanation: "Iron oxide dust gives Mars its red colour.",
};

function renderCard(props = {}) {
  const onSelect = vi.fn();
  render(
    <QuizQuestionCard
      question={question}
      index={0}
      selectedAnswer=""
      submitted={false}
      onSelect={onSelect}
      {...props}
    />
  );
  return { onSelect };
}

describe("QuizQuestionCard", () => {
  test("renders the prompt and its options as a radio group", () => {
    renderCard();
    expect(screen.getByText(question.question)).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Question 1 options" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(question.options.length);
    expect(screen.getByRole("radio", { name: "Mars" })).toHaveAttribute("aria-checked", "false");
  });

  test("reports the chosen option", () => {
    const { onSelect } = renderCard();
    fireEvent.click(screen.getByRole("radio", { name: "Venus" }));
    expect(onSelect).toHaveBeenCalledWith("Venus");
  });

  test("marks a correct answer and hides the answer key", () => {
    renderCard({ submitted: true, selectedAnswer: "Mars" });
    expect(screen.getByText("Correct")).toBeInTheDocument();
    expect(screen.queryByText(/Correct answer/i)).not.toBeInTheDocument();
    expect(screen.getByText(question.explanation)).toBeInTheDocument();
  });

  test("marks a wrong answer and shows the correct one", () => {
    renderCard({ submitted: true, selectedAnswer: "Venus" });
    expect(screen.getByText("Incorrect")).toBeInTheDocument();
    expect(screen.getByText(/Correct answer/i)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Mars" })).toHaveAttribute("aria-checked", "false");
  });
});
