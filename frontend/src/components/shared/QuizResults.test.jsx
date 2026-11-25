import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import QuizResults from "./QuizResults";

const questions = [
  {
    id: "q1",
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter"],
    answer: "Mars",
    explanation: "Iron oxide dust gives Mars its red colour.",
  },
  {
    id: "q2",
    question: "Which gas do plants absorb?",
    options: ["Oxygen", "Nitrogen", "Carbon dioxide"],
    answer: "Carbon dioxide",
    explanation: "Photosynthesis uses carbon dioxide and water to make sugars.",
  },
];

function renderResults(props = {}) {
  const onSelectAnswer = jest.fn();
  const onSubmit = jest.fn();
  const onRetry = jest.fn();
  render(
    // The shared Button reads the current route, so it needs a router.
    <MemoryRouter>
      <QuizResults
        questions={questions}
        answers={{}}
        submitted={false}
        onSelectAnswer={onSelectAnswer}
        onSubmit={onSubmit}
        onRetry={onRetry}
        {...props}
      />
    </MemoryRouter>
  );
  return { onSelectAnswer, onSubmit, onRetry };
}

describe("QuizResults", () => {
  test("lists every question with a submit button that counts the answers", () => {
    renderResults({ answers: { q1: "Mars" } });
    expect(screen.getByText(questions[0].question)).toBeInTheDocument();
    expect(screen.getByText(questions[1].question)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit Quiz \(1\/2\)/ })).toBeInTheDocument();
    expect(screen.getByText("1 remaining")).toBeInTheDocument();
  });

  test("reports the chosen option against its question", () => {
    const { onSelectAnswer } = renderResults();
    fireEvent.click(screen.getByRole("radio", { name: "Mars" }));
    expect(onSelectAnswer).toHaveBeenCalledWith("q1", "Mars");
  });

  test("submits with the questions it rendered", () => {
    const { onSubmit } = renderResults({ answers: { q1: "Mars", q2: "Oxygen" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Quiz/ }));
    expect(onSubmit).toHaveBeenCalledWith(questions);
  });

  test("grades the quiz once it is submitted", () => {
    const { onRetry } = renderResults({ submitted: true, answers: { q1: "Mars", q2: "Oxygen" } });
    // One of two right.
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Your answers")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 correct")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Try Again/ }));
    expect(onRetry).toHaveBeenCalled();
  });

  test("hides the submit bar once the quiz is graded", () => {
    renderResults({ submitted: true, answers: { q1: "Mars", q2: "Carbon dioxide" } });
    expect(screen.queryByRole("button", { name: /Submit Quiz/ })).not.toBeInTheDocument();
  });
});
