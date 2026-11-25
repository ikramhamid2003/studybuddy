import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Flashcard from "./Flashcard";
import FlashcardsResult from "../studio/FlashcardsResult";

const card = { id: 1, front: "What is ATP?", back: "The cell's energy currency", hint: "Think energy" };

test("the card's name carries the question, hint and position", () => {
  render(<Flashcard card={card} index={2} total={5} />);
  const button = screen.getByRole("button", { name: /Card 3 of 5, question: What is ATP\?/ });
  expect(button).toHaveAccessibleName(/Hint: Think energy/);
});

test("Enter and Space flip the card and announce the answer", () => {
  render(<Flashcard card={card} index={0} total={1} />);
  const button = screen.getByRole("button");
  button.focus();
  expect(screen.getByRole("status")).toHaveTextContent("");

  fireEvent.keyDown(button, { key: "Enter" });
  expect(button).toHaveAccessibleName(/answer: The cell's energy currency/);
  expect(screen.getByRole("status")).toHaveTextContent("Answer: The cell's energy currency");

  fireEvent.keyDown(button, { key: " " });
  expect(button).toHaveAccessibleName(/question: What is ATP\?/);
  expect(screen.getByRole("status")).toHaveTextContent("Question: What is ATP?");
});

test("arrow keys, Home and End move focus between cards", () => {
  const cards = [1, 2, 3].map((n) => ({ id: n, front: `Q${n}`, back: `A${n}` }));
  render(
    <MemoryRouter>
      <FlashcardsResult result={{ flashcards: cards }} deckKey="k" onExportCSV={() => {}} onResetCards={() => {}} />
    </MemoryRouter>
  );
  const buttons = screen.getAllByRole("button", { name: /^Card/ });
  buttons[0].focus();
  let current = 0;
  const press = (key, expected) => {
    fireEvent.keyDown(buttons[current], { key });
    current = expected;
    expect(buttons[current]).toHaveFocus();
  };

  press("ArrowRight", 1);
  press("End", 2);
  press("ArrowRight", 2);
  press("Home", 0);
  press("ArrowLeft", 0);
  expect(screen.getByRole("group", { name: "Flashcards, 3 cards" })).toBeInTheDocument();
});
