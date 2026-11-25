import { fireEvent, render, screen } from "@testing-library/react";
import SessionRow from "./SessionRow";

const session = { id: 7, title: "Organic chemistry" };

function setup(props = {}) {
  const handlers = { onSelect: jest.fn(), onRename: jest.fn(), onDelete: jest.fn() };
  render(<SessionRow session={session} active={false} collapsed={false} {...handlers} {...props} />);
  return handlers;
}

test("the row is a real button, so it can be focused and opened from the keyboard", () => {
  const { onSelect } = setup();
  const row = screen.getByRole("button", { name: "Organic chemistry" });
  row.focus();
  expect(row).toHaveFocus();
  fireEvent.click(row);
  expect(onSelect).toHaveBeenCalledWith(7);
});

test("the open chat is marked as current", () => {
  setup({ active: true });
  expect(screen.getByRole("button", { name: "Organic chemistry" })).toHaveAttribute(
    "aria-current",
    "true"
  );
});

test("the actions menu names its chat, reports its state, and Escape closes it and restores focus", () => {
  setup();
  const trigger = screen.getByRole("button", { name: "Actions for Organic chemistry" });
  expect(trigger).toHaveAttribute("aria-expanded", "false");

  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();

  fireEvent.keyDown(screen.getByRole("button", { name: "Rename" }), { key: "Escape" });
  expect(screen.queryByRole("button", { name: "Rename" })).toBeNull();
  expect(trigger).toHaveFocus();
});

test("renaming gives the title field an accessible name and commits on Enter", () => {
  const { onRename } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Actions for Organic chemistry" }));
  fireEvent.click(screen.getByRole("button", { name: "Rename" }));

  const field = screen.getByRole("textbox", { name: "Chat title" });
  fireEvent.change(field, { target: { value: "Orgo II" } });
  fireEvent.keyDown(field, { key: "Enter" });

  expect(onRename).toHaveBeenCalledWith(7, "Orgo II");
});
