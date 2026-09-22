import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChatPage from "./ChatPage";
import { listChatSessions, getChatSession } from "../utils/api";

jest.mock("../utils/api", () => ({
  sendChatStream: jest.fn(),
  listChatSessions: jest.fn(),
  createChatSession: jest.fn(),
  getChatSession: jest.fn(),
  renameChatSession: jest.fn(),
  deleteChatSession: jest.fn(),
}));

function renderChat() {
  // MemoryRouter satisfies the PageHeader's useLocation call.
  return render(
    <MemoryRouter initialEntries={["/chat"]}>
      <ChatPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  // jsdom has no layout engine, so the transcript's auto-scroll needs a stub.
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  localStorage.clear();
  listChatSessions.mockResolvedValue([]);
  getChatSession.mockResolvedValue({ messages: [] });
});

test("sessions rail collapses to a narrow icon rail and expands again", async () => {
  renderChat();
  const rail = await screen.findByRole("complementary", { name: "Chat sessions" });

  // Width lives in complete class strings; a runtime-built `lg:w-${...}` emits no CSS.
  expect(rail.className).toContain("lg:w-56");

  fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));

  expect(rail.className).toContain("lg:w-20");
  expect(rail.className).not.toContain("lg:w-56");

  fireEvent.click(screen.getByRole("button", { name: /expand sidebar/i }));

  expect(rail.className).toContain("lg:w-56");
});

test("collapsed rail hides session titles and labels on desktop only", async () => {
  listChatSessions.mockResolvedValue([{ id: 1, title: "Kinematics" }]);
  renderChat();

  await screen.findByText("Kinematics");
  fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));

  // Text stays mounted for the always-wide mobile drawer, but is hidden at `lg`.
  expect(screen.getByText("Kinematics").className).toContain("lg:hidden");
  expect(screen.getByText("New Chat").className).toContain("lg:hidden");
});
