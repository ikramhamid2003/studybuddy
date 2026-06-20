import { render, screen } from "@testing-library/react";
import Card from "./Card";

test("renders Card component with children text", () => {
  render(<Card>Hello Card</Card>);
  const cardElement = screen.getByText(/Hello Card/i);
  expect(cardElement).toBeDefined();
});
