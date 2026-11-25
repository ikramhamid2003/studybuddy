import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Layout from "./Layout";

jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { username: "demo" }, logout: jest.fn() }),
}));

function setup() {
  render(
    <MemoryRouter initialEntries={["/quiz"]}>
      <Layout><p>content</p></Layout>
    </MemoryRouter>,
  );
  return screen.getByRole("button", { name: /Quiz|Menu/, expanded: false });
}

test("Escape closes the mobile tools menu and returns focus to its button", () => {
  const toggle = setup();
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(toggle).toHaveAttribute("aria-controls", "mobile-tools-menu");

  fireEvent.keyDown(document, { key: "Escape" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(toggle).toHaveFocus();
});
