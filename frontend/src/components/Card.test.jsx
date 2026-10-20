import { render, screen, fireEvent } from "@testing-library/react";
import Card from "./Card";

describe("Card", () => {
  test("renders children", () => {
    render(<Card>Study content</Card>);
    expect(screen.getByText("Study content")).toBeInTheDocument();
  });

  test("becomes a button when onClick is provided", () => {
    const onClick = jest.fn();
    render(
      <Card onClick={onClick} hover>
        Clickable card
      </Card>
    );
    const card = screen.getByRole("button");
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("activates on Enter when clickable", () => {
    const onClick = jest.fn();
    render(<Card onClick={onClick}>Keyboard card</Card>);
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
