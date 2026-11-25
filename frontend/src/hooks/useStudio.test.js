import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import toast from "react-hot-toast";
import useStudio from "./useStudio";
import {
  generateAll,
  listGenerations,
  deleteGeneration,
  listChatSessions,
  getChatSession,
  deleteChatSession,
} from "../utils/api";

vi.mock("react-hot-toast", () => ({ __esModule: true, default: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../context/DocumentLibraryContext", () => ({
  useLibrary: () => ({ selectedIds: new Set([4, 5]) }),
}));
vi.mock("../utils/api", () => ({
  generateAll: vi.fn(),
  listGenerations: vi.fn(),
  deleteGeneration: vi.fn(),
  listChatSessions: vi.fn(),
  getChatSession: vi.fn(),
  deleteChatSession: vi.fn(),
}));

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return renderHook(() => useStudio(), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  listGenerations.mockResolvedValue([]);
  listChatSessions.mockResolvedValue([]);
});

test("refuses to generate without a topic", () => {
  const { result } = setup();
  act(() => result.current.handleGenerate());
  expect(toast.error).toHaveBeenCalledWith("Please enter a topic");
  expect(generateAll).not.toHaveBeenCalled();
});

test("summarize needs at least 30 characters", () => {
  const { result } = setup();
  act(() => {
    result.current.setType("summarize");
    result.current.setTopic("too short");
  });
  act(() => result.current.handleGenerate());
  expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/too short/i));
  expect(generateAll).not.toHaveBeenCalled();
});

test("generating sends the per-type options plus the grounding document ids", async () => {
  generateAll.mockResolvedValue({ questions: [] });
  const { result } = setup();
  act(() => {
    result.current.setType("quiz");
    result.current.setTopic("  Photosynthesis ");
    result.current.setNumQ("8");
    result.current.setDifficulty("hard");
  });

  act(() => result.current.handleGenerate());

  await waitFor(() => expect(result.current.active).not.toBeNull());
  const [topic, type, options] = generateAll.mock.calls[0];
  expect(topic).toBe("Photosynthesis");
  expect(type).toBe("quiz");
  expect(options).toMatchObject({ num_questions: 8, difficulty: "hard" });
  expect(options.document_ids).toEqual([4, 5]);
  expect(result.current.active).toMatchObject({ type: "quiz", topic: "Photosynthesis" });
});

test("a quiz can only be submitted once every question is answered", async () => {
  generateAll.mockResolvedValue({ questions: [] });
  const { result } = setup();
  const questions = [{ id: "a" }, { id: "b" }];

  act(() => result.current.handleSelectAnswer("a", "x"));
  act(() => result.current.handleSubmitQuiz(questions));
  expect(toast.error).toHaveBeenCalledWith("Answer all 2 questions first");
  expect(result.current.submitted).toBe(false);

  act(() => result.current.handleSelectAnswer("b", "y"));
  act(() => result.current.handleSubmitQuiz(questions));
  expect(result.current.submitted).toBe(true);

  // Answers lock once submitted.
  act(() => result.current.handleSelectAnswer("a", "changed"));
  expect(result.current.answers.a).toBe("x");

  act(() => result.current.retryQuiz());
  expect(result.current.submitted).toBe(false);
  expect(result.current.answers).toEqual({});
});

test("opening a saved generation shows it and clears any quiz state", () => {
  const { result } = setup();
  act(() => result.current.handleSelectAnswer("a", "x"));

  act(() =>
    result.current.openFromHistory({ type: "explain", topic: "Gravity", result: { explanation: "pull" } })
  );

  expect(result.current.active).toEqual({
    type: "explain",
    topic: "Gravity",
    result: { explanation: "pull" },
  });
  expect(result.current.answers).toEqual({});
});

test("deleting a saved generation asks first and closes it if it was open", async () => {
  const item = { id: 3, type: "explain", topic: "T", result: { explanation: "e" } };
  listGenerations.mockResolvedValue([item]);
  deleteGeneration.mockResolvedValue({});
  const { result } = setup();
  await waitFor(() => expect(result.current.history).toHaveLength(1));
  act(() => result.current.openFromHistory(item));

  vi.spyOn(window, "confirm").mockReturnValueOnce(false);
  await act(async () => result.current.deleteGenerationHandler(item));
  expect(deleteGeneration).not.toHaveBeenCalled();

  vi.spyOn(window, "confirm").mockReturnValueOnce(true);
  await act(async () => result.current.deleteGenerationHandler(item));
  expect(deleteGeneration).toHaveBeenCalledWith(3);
  expect(result.current.active).toBeNull();
});

test("starting a chat from the topic box sends it as the first message", async () => {
  generateAll.mockResolvedValue({ reply: "Hello there" });
  const { result } = setup();
  act(() => {
    result.current.setType("chat");
    result.current.setTopic("Teach me about atoms");
  });

  act(() => result.current.handleGenerate());

  await waitFor(() => expect(result.current.chatTurns).toHaveLength(2));
  expect(generateAll).toHaveBeenCalledWith(
    "Teach me about atoms",
    "chat",
    expect.objectContaining({ history: [], document_ids: [4, 5] })
  );
  expect(result.current.chatStarted).toBe(true);
  expect(result.current.chatTurns[1]).toEqual({ role: "assistant", content: "Hello there" });
});

test("chat sessions load when the chat tool is selected and can be opened and deleted", async () => {
  listChatSessions.mockResolvedValue([{ id: 1, title: "Atoms" }]);
  getChatSession.mockResolvedValue({ messages: [{ role: "user", content: "hi" }] });
  deleteChatSession.mockResolvedValue({});
  const { result } = setup();
  expect(listChatSessions).not.toHaveBeenCalled();

  act(() => result.current.setType("chat"));
  await waitFor(() => expect(result.current.chatSessions).toHaveLength(1));

  await act(async () => result.current.openChatSession(1));
  expect(result.current.activeChatSessionId).toBe(1);
  expect(result.current.chatTurns).toEqual([{ role: "user", content: "hi" }]);

  await act(async () => result.current.deleteChatSessionHandler(1));
  expect(result.current.chatSessions).toEqual([]);
  expect(result.current.activeChatSessionId).toBeNull();
  expect(result.current.chatStarted).toBe(false);
});
