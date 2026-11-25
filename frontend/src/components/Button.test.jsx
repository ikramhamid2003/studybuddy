import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Button from "./Button";

const renderButton = (props) =>
  render(
    <MemoryRouter>
      <Button {...props}>Label</Button>
    </MemoryRouter>,
  );

test.each([
  ["secondary", undefined, "text-slate-800"],
  ["ghost", undefined, "text-slate-700"],
  ["danger", undefined, "text-rose-900"],
  ["success", undefined, "text-emerald-900"],
  ["ghost", "sky", "text-sky-800"],
  ["secondary", "rose", "text-rose-900"],
])("%s (%s) uses dark ink on the light surface", (variant, color, ink) => {
  renderButton({ variant, color });
  expect(screen.getByRole("button", { name: "Label" })).toHaveClass(ink);
});

test("surface=dark keeps the light-on-dark tints for dark panels", () => {
  renderButton({ variant: "ghost", surface: "dark" });
  const button = screen.getByRole("button", { name: "Label" });
  expect(button).toHaveClass("text-slate-400");
  expect(button).toHaveClass("focus-visible:ring-offset-slate-950");
});

test("primary buttons are unchanged by the surface prop", () => {
  renderButton({ variant: "primary", color: "sky" });
  expect(screen.getByRole("button", { name: "Label" })).toHaveClass("text-slate-950");
});
