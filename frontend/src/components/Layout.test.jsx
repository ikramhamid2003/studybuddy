import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Layout from "./Layout";

jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, username: "alice" },
    logout: jest.fn(),
    loading: false,
  }),
}));

function renderLayout(path) {
  // MemoryRouter lets each test choose the active route without a browser.
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Layout>
        <div>page content</div>
      </Layout>
    </MemoryRouter>
  );
}

test("sidebar shows default Student name instead of username", () => {
  renderLayout("/explain");
  expect(screen.getByText("Student")).toBeDefined();
  expect(screen.queryByText("alice")).toBeNull();
  // the old duplicate "Student" role label under the name is gone
  expect(screen.getAllByText("Student")).toHaveLength(1);
});

test("sidebar is desktop-only and small screens get a dropdown header", () => {
  renderLayout("/explain");
  const aside = screen.getByRole("complementary");
  expect(aside.className).toContain("hidden");
  expect(aside.className).toContain("lg:flex");
  // old drawer transform is gone
  expect(aside.className).not.toContain("-translate-x-full");

  const header = screen.getByRole("banner");
  expect(header.className).toContain("lg:hidden");
  expect(within(header).queryByRole("navigation")).toBeNull(); // dropdown nav only opens on click
});

test("dropdown opens with nav items and user section, closes on navigation", () => {
  renderLayout("/explain");
  // before opening: only the desktop sidebar nav exists in the DOM
  expect(screen.getAllByText("Summarize")).toHaveLength(1);

  fireEvent.click(screen.getByRole("button", { name: /explain/i }));

  // sidebar nav + dropdown nav now both render
  expect(screen.getAllByText("Summarize")).toHaveLength(2);
  expect(screen.getAllByText("Student")).toHaveLength(2);
  expect(screen.getAllByRole("button", { name: /sign out/i })).toHaveLength(2);
  expect(screen.getAllByRole("navigation")).toHaveLength(2);

  fireEvent.click(screen.getAllByRole("link", { name: /summarize/i })[1]);
  expect(screen.getAllByRole("navigation")).toHaveLength(1); // dropdown closed
  // trigger label follows the new current page after navigation
  expect(screen.getByRole("button", { name: /summarize/i })).toBeDefined();
});
