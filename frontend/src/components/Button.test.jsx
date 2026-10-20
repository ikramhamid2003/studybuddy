import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Button from "./Button";

function renderButton(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("Button", () => {
  test("renders children and fires onClick", () => {
    const onClick = jest.fn();
    renderButton(<Button onClick={onClick}>Generate</Button>);
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("shows loading spinner and sets aria-busy", () => {
    renderButton(
      <Button loading onClick={() => {}}>
        Save
      </Button>
    );
    const btn = screen.getByRole("button", { name: /save/i });
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toBeDisabled();
  });

  test("respects disabled prop", () => {
    const onClick = jest.fn();
    renderButton(
      <Button disabled onClick={onClick}>
        Locked
      </Button>
    );
    fireEvent.click(screen.getByRole("button", { name: /locked/i }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
