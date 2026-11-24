import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ResultView from "./ResultView";
import HistoryList from "./HistoryList";

const router = (ui) => (
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter>
);

const noop = () => {};
const base = {
  answers: {},
  submitted: false,
  onSelectAnswer: noop,
  onSubmitQuiz: noop,
  onRetryQuiz: noop,
  onExportCSV: noop,
  onResetCards: noop,
  deckKey: 0,
};

test("explain result shows the explanation, key points and analogy", () => {
  render(
    router(
      <ResultView
        {...base}
        active={{
          type: "explain",
          result: { explanation: "Plants make food.", key_points: ["Light in"], analogy: "A solar kitchen" },
        }}
      />
    )
  );
  expect(screen.getByText("Plants make food.")).toBeInTheDocument();
  expect(screen.getByText("Light in")).toBeInTheDocument();
  expect(screen.getByText("A solar kitchen")).toBeInTheDocument();
});

test("summary result lists key concepts", () => {
  render(
    router(
      <ResultView
        {...base}
        active={{ type: "summarize", result: { summary: "Short.", key_concepts: ["Energy"] } }}
      />
    )
  );
  expect(screen.getByText("Short.")).toBeInTheDocument();
  expect(screen.getByText("Energy")).toBeInTheDocument();
});

const quiz = {
  type: "quiz",
  result: {
    questions: [
      { id: "q1", question: "2+2?", options: ["3", "4"], answer: "4", explanation: "Arithmetic" },
    ],
  },
};

test("quiz result reports progress and passes the picked answer up", () => {
  const onSelectAnswer = jest.fn();
  render(router(<ResultView {...base} active={quiz} onSelectAnswer={onSelectAnswer} />));
  expect(screen.getByText("Submit Quiz (0/1)")).toBeInTheDocument();
  fireEvent.click(screen.getByText("4"));
  expect(onSelectAnswer).toHaveBeenCalledWith("q1", "4");
});

test("a submitted quiz shows the explanation and hides the submit button", () => {
  render(router(<ResultView {...base} active={quiz} answers={{ q1: "3" }} submitted />));
  expect(screen.getByText(/Arithmetic/)).toBeInTheDocument();
  expect(screen.queryByText(/Submit Quiz/)).toBeNull();
});

test("flashcards result shows the count and wires export and reset", () => {
  const onExportCSV = jest.fn();
  const onResetCards = jest.fn();
  render(
    router(
      <ResultView
        {...base}
        onExportCSV={onExportCSV}
        onResetCards={onResetCards}
        active={{
          type: "flashcards",
          result: { flashcards: [{ id: 1, front: "Mitosis", back: "Cell division", hint: "" }] },
        }}
      />
    )
  );
  expect(screen.getByText(/1 cards/)).toBeInTheDocument();
  fireEvent.click(screen.getByText("Export CSV"));
  fireEvent.click(screen.getByText("Reset All"));
  expect(onExportCSV).toHaveBeenCalled();
  expect(onResetCards).toHaveBeenCalled();
});

test("a saved chat reply renders its text", () => {
  render(router(<ResultView {...base} active={{ type: "chat", result: { reply: "Sure thing." } }} />));
  expect(screen.getByText("Sure thing.")).toBeInTheDocument();
});

const history = [
  { id: 1, type: "explain", topic: "Gravity", created_at: "2025-01-01T00:00:00Z", result: { a: 1 } },
  { id: 2, type: "quiz", topic: "Algebra", created_at: "2025-01-02T00:00:00Z", result: { b: 2 } },
];

function setupHistory(props = {}) {
  const handlers = { onTabChange: jest.fn(), onOpen: jest.fn(), onDelete: jest.fn() };
  render(
    router(
      <HistoryList
        history={history}
        loading={false}
        selectedTab="all"
        active={null}
        {...handlers}
        {...props}
      />
    )
  );
  return handlers;
}

test("history shows an empty state when nothing is saved", () => {
  setupHistory({ history: [] });
  expect(screen.getByText("No saved generations yet")).toBeInTheDocument();
});

test("history lists every item on the All tab and filters by type", () => {
  const { rerender } = render(
    router(
      <HistoryList history={history} loading={false} selectedTab="all" active={null}
        onTabChange={noop} onOpen={noop} onDelete={noop} />
    )
  );
  expect(screen.getByText("Gravity")).toBeInTheDocument();
  expect(screen.getByText("Algebra")).toBeInTheDocument();

  rerender(
    router(
      <HistoryList history={history} loading={false} selectedTab="quiz" active={null}
        onTabChange={noop} onOpen={noop} onDelete={noop} />
    )
  );
  expect(screen.queryByText("Gravity")).toBeNull();
  expect(screen.getByText("Algebra")).toBeInTheDocument();
});

test("clicking a history row opens it and the trash button deletes it", () => {
  const handlers = setupHistory();
  fireEvent.click(screen.getByText("Gravity"));
  expect(handlers.onOpen).toHaveBeenCalledWith(history[0]);

  fireEvent.click(screen.getByRole("button", { name: /Delete saved quiz generation "Algebra"/ }));
  expect(handlers.onDelete).toHaveBeenCalledWith(history[1]);
});

test("switching a tab reports the tab key", () => {
  const handlers = setupHistory();
  fireEvent.click(screen.getByRole("button", { name: /^Quiz\s*1$/ }));
  expect(handlers.onTabChange).toHaveBeenCalledWith("quiz");
});
