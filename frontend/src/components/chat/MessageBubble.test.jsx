import { render, screen } from "@testing-library/react";
import MessageBubble from "./MessageBubble";

test("renders a user message", () => {
  render(<MessageBubble msg={{ role: "user", content: "What is entropy?" }} />);
  expect(screen.getByText("What is entropy?")).toBeInTheDocument();
});

test("renders an assistant message", () => {
  render(<MessageBubble msg={{ role: "assistant", content: "A measure of disorder." }} />);
  expect(screen.getByText("A measure of disorder.")).toBeInTheDocument();
});

test("shows source citations only on assistant replies", () => {
  const sources = [
    { document_title: "Thermo notes", page_number: 2, score: 0.8, text_preview: "..." },
  ];
  const { rerender } = render(
    <MessageBubble msg={{ role: "assistant", content: "answer", sources }} />
  );
  expect(screen.getByText("Thermo notes")).toBeInTheDocument();

  rerender(<MessageBubble msg={{ role: "user", content: "answer", sources }} />);
  expect(screen.queryByText("Thermo notes")).toBeNull();
});

test("announces who is speaking to screen readers", () => {
  const { rerender } = render(<MessageBubble msg={{ role: "user", content: "hi" }} />);
  expect(screen.getByText("You said:")).toBeInTheDocument();
  rerender(<MessageBubble msg={{ role: "assistant", content: "hello" }} />);
  expect(screen.getByText("Assistant said:")).toBeInTheDocument();
});
