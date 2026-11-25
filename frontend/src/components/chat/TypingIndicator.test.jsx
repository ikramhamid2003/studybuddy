import { render, screen } from "@testing-library/react";
import TypingIndicator from "./TypingIndicator";

test("is announced as a status instead of silent animated dots", () => {
  render(<TypingIndicator />);
  expect(screen.getByRole("status")).toHaveTextContent("Assistant is typing");
});
