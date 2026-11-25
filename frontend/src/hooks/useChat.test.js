import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import useChat from "./useChat";
import {
  sendChatStream,
  listChatSessions,
  createChatSession,
  getChatSession,
  renameChatSession,
  deleteChatSession,
} from "../utils/api";
import { LAST_CHAT_SESSION_KEY, WELCOME } from "../components/chat/chatConstants";

vi.mock("react-hot-toast", () => ({ __esModule: true, default: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../utils/pendingTopic", () => ({ usePendingTopic: vi.fn() }));
vi.mock("../utils/api", () => ({
  sendChatStream: vi.fn(),
  listChatSessions: vi.fn(),
  createChatSession: vi.fn(),
  getChatSession: vi.fn(),
  renameChatSession: vi.fn(),
  deleteChatSession: vi.fn(),
}));

const library = { selectedIds: new Set() };

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return renderHook(() => useChat(library), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  listChatSessions.mockResolvedValue([]);
});

test("starts with the welcome message and loads the session list", async () => {
  listChatSessions.mockResolvedValue([{ id: 1, title: "Physics" }]);
  getChatSession.mockResolvedValue({ messages: [] });
  const { result } = setup();

  expect(result.current.messages).toEqual([WELCOME]);
  await waitFor(() => expect(result.current.sessionsLoading).toBe(false));
  expect(result.current.sessions).toHaveLength(1);
});

test("reopens the last used chat on first load and hydrates its transcript", async () => {
  localStorage.setItem(LAST_CHAT_SESSION_KEY, "2");
  listChatSessions.mockResolvedValue([
    { id: 1, title: "Newest" },
    { id: 2, title: "Remembered" },
  ]);
  getChatSession.mockResolvedValue({
    messages: [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ],
  });
  const { result } = setup();

  await waitFor(() => expect(result.current.activeSessionId).toBe(2));
  expect(getChatSession).toHaveBeenCalledWith(2);
  expect(result.current.messages.map((m) => m.content)).toEqual(["hi", "hello"]);
});

test("first message creates a session, then streams chunks into one assistant bubble", async () => {
  createChatSession.mockResolvedValue({ id: 9 });
  sendChatStream.mockImplementation(async (_msg, _hist, _sid, onChunk, onDone) => {
    onChunk("Hel");
    onChunk("lo");
    onDone(9, [{ document_title: "Notes" }]);
  });
  const { result } = setup();
  await waitFor(() => expect(result.current.sessionsLoading).toBe(false));

  await act(async () => {
    await result.current.handleSend("What is gravity?");
  });

  expect(createChatSession).toHaveBeenCalledTimes(1);
  expect(sendChatStream.mock.calls[0][2]).toBe(9);
  expect(localStorage.getItem(LAST_CHAT_SESSION_KEY)).toBe("9");
  const [, user, assistant] = result.current.messages;
  expect(user).toEqual({ role: "user", content: "What is gravity?" });
  expect(assistant.content).toBe("Hello");
  expect(assistant.sources).toEqual([{ document_title: "Notes" }]);
  expect(result.current.loading).toBe(false);
});

test("ignores empty input and sends nothing", async () => {
  const { result } = setup();
  await waitFor(() => expect(result.current.sessionsLoading).toBe(false));

  await act(async () => {
    await result.current.handleSend("   ");
  });

  expect(sendChatStream).not.toHaveBeenCalled();
});

test("a failed stream shows an error bubble and stops loading", async () => {
  createChatSession.mockResolvedValue({ id: 3 });
  sendChatStream.mockImplementation(async (_m, _h, _s, _c, _d, onError) => {
    onError(new Error("boom"));
  });
  const { result } = setup();
  await waitFor(() => expect(result.current.sessionsLoading).toBe(false));

  await act(async () => {
    await result.current.handleSend("hi");
  });

  expect(result.current.loading).toBe(false);
  expect(result.current.messages.at(-1).content).toMatch(/Connection error/);
});

test("passes the selected document ids to ground the turn", async () => {
  createChatSession.mockResolvedValue({ id: 4 });
  sendChatStream.mockImplementation(async (_m, _h, _s, _c, onDone) => onDone(4, []));
  const grounded = { selectedIds: new Set([7, 8]) };
  const queryClient = new QueryClient();
  const wrapper = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  const { result } = renderHook(() => useChat(grounded), { wrapper });
  await waitFor(() => expect(result.current.sessionsLoading).toBe(false));

  await act(async () => {
    await result.current.handleSend("explain");
  });

  expect(sendChatStream.mock.calls[0][6]).toEqual([7, 8]);
});

test("startNewChat clears the transcript and forgets the remembered session", async () => {
  listChatSessions.mockResolvedValue([{ id: 1, title: "A" }]);
  getChatSession.mockResolvedValue({ messages: [{ role: "user", content: "x" }] });
  const { result } = setup();
  await waitFor(() => expect(result.current.activeSessionId).toBe(1));

  act(() => result.current.startNewChat());

  expect(result.current.activeSessionId).toBeNull();
  expect(result.current.messages).toEqual([WELCOME]);
  expect(localStorage.getItem(LAST_CHAT_SESSION_KEY)).toBeNull();
});

test("renaming updates the title in the session list", async () => {
  listChatSessions.mockResolvedValue([{ id: 1, title: "Old" }]);
  getChatSession.mockResolvedValue({ messages: [] });
  renameChatSession.mockResolvedValue({});
  const { result } = setup();
  await waitFor(() => expect(result.current.sessions).toHaveLength(1));

  await act(async () => {
    await result.current.handleRename(1, "New title");
  });

  expect(result.current.sessions[0].title).toBe("New title");
});

test("deleting the open chat removes it and starts a fresh one", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  listChatSessions.mockResolvedValue([{ id: 1, title: "A" }]);
  getChatSession.mockResolvedValue({ messages: [] });
  deleteChatSession.mockResolvedValue({});
  const { result } = setup();
  await waitFor(() => expect(result.current.activeSessionId).toBe(1));

  await act(async () => {
    await result.current.handleDelete(1);
  });

  expect(result.current.sessions).toEqual([]);
  expect(result.current.activeSessionId).toBeNull();
});

test("declining the delete confirmation leaves the chat alone", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(false);
  listChatSessions.mockResolvedValue([{ id: 1, title: "A" }]);
  getChatSession.mockResolvedValue({ messages: [] });
  const { result } = setup();
  await waitFor(() => expect(result.current.sessions).toHaveLength(1));

  await act(async () => {
    await result.current.handleDelete(1);
  });

  expect(deleteChatSession).not.toHaveBeenCalled();
  expect(result.current.sessions).toHaveLength(1);
});
