import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SessionSidebar from "./SessionSidebar";

const base = {
  sessions: [],
  sessionsLoading: false,
  activeSessionId: null,
  open: false,
  collapsed: false,
  onClose: vi.fn(),
  onNewChat: vi.fn(),
  onSelect: vi.fn(),
  onRename: vi.fn(),
  onDelete: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

// Button reads the current route for its accent colour, so it needs a router.
const ui = (props) => (
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <SessionSidebar {...base} {...props} />
  </MemoryRouter>
);

test("shows an empty state when there are no chats", () => {
  render(ui());
  expect(screen.getByText("No chats yet")).toBeInTheDocument();
});

test("New Chat button starts a chat", () => {
  render(ui());
  fireEvent.click(screen.getByRole("button", { name: "New Chat" }));
  expect(base.onNewChat).toHaveBeenCalledTimes(1);
});

test("selecting a session opens it and closes the mobile drawer", () => {
  render(ui({ sessions: [{ id: 5, title: "Calculus" }], open: true }));
  fireEvent.click(screen.getByText("Calculus"));
  expect(base.onSelect).toHaveBeenCalledWith(5);
  expect(base.onClose).toHaveBeenCalled();
});

test("the backdrop only exists while the drawer is open and closes it on click", () => {
  const { rerender } = render(ui());
  expect(screen.queryByTestId("sidebar-backdrop")).toBeNull();

  rerender(ui({ open: true }));
  fireEvent.click(screen.getByTestId("sidebar-backdrop"));
  expect(base.onClose).toHaveBeenCalledTimes(1);
});

test("Escape closes the open drawer and focus returns to what opened it", () => {
  const opener = document.createElement("button");
  document.body.appendChild(opener);
  opener.focus();

  const { rerender } = render(ui());
  rerender(ui({ open: true }));
  expect(screen.getByRole("button", { name: "Close sidebar" })).toHaveFocus();

  fireEvent.keyDown(document, { key: "Escape" });
  expect(base.onClose).toHaveBeenCalledTimes(1);

  rerender(ui({ open: false }));
  expect(opener).toHaveFocus();
  opener.remove();
});

test("a re-render while open does not steal focus or close the drawer", () => {
  const { rerender } = render(ui({ open: true }));
  const close = screen.getByRole("button", { name: "Close sidebar" });
  screen.getByRole("button", { name: "New Chat" }).focus();

  rerender(ui({ open: true, onClose: vi.fn() }));

  expect(close).not.toHaveFocus();
});
