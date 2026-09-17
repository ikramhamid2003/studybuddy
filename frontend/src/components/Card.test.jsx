import { render, screen } from "@testing-library/react";
import Card from "./Card";

test("renders Card component with children text", () => {
  // Smoke-test the shared wrapper without coupling to its visual classes.
  render(<Card>Hello Card</Card>);
  const cardElement = screen.getByText(/Hello Card/i);
  expect(cardElement).toBeDefined();
});
