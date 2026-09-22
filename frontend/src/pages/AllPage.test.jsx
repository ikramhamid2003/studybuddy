import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AllPage from "./AllPage";
import { generateAll, listGenerations, deleteGeneration } from "../utils/api";

jest.mock("../utils/api", () => ({
  generateAll: jest.fn(),
  listGenerations: jest.fn(),
  deleteGeneration: jest.fn(),
}));

afterEach(() => {
  jest.restoreAllMocks();
});

function renderPage() {
  // A fresh QueryClient keeps React Query cache isolated per test.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AllPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

const QUIZ_RESULT = {
  // Shared fixture mirrors the backend quiz payload shape.
  questions: [
    {
      id: 1,
      question: "What is gravity?",
      options: ["A) force", "B) color", "C) sound", "D) taste"],
      answer: "A) force",
      explanation: "because physics",
    },
  ],
  generation_id: 7,
};

test("shows topic input, tool dropdown with 5 options, and saved history", async () => {
  listGenerations.mockResolvedValue([
    {
      id: 1,
      type: "explain",
      topic: "gravity",
      result: { explanation: "old result" },
      created_at: "2026-01-01T00:00:00Z",
    },
  ]);

  renderPage();

  expect(screen.getByLabelText("Topic")).toBeDefined();
  const select = screen.getByLabelText("Tool type");
  expect(select.options).toHaveLength(5);

  await screen.findByText("gravity");
  expect(screen.getByText(/Saved Generations/i)).toBeDefined();
});

test("shows the matching option controls when switching tools", () => {
  listGenerations.mockResolvedValue([]);

  renderPage();

  // explain → Level
  expect(screen.getByLabelText("Level")).toBeDefined();
  expect(screen.queryByLabelText("Format")).toBeNull();

  fireEvent.change(screen.getByLabelText("Tool type"), {
    target: { value: "summarize" },
  });
  expect(screen.getByLabelText("Format")).toBeDefined();
  expect(screen.queryByLabelText("Level")).toBeNull();

  fireEvent.change(screen.getByLabelText("Tool type"), {
    target: { value: "flashcards" },
  });
  expect(screen.getByLabelText("Number of cards")).toBeDefined();

  // chat mode shows topic input (for context) and sessions list, but chat panel is hidden until started
  fireEvent.change(screen.getByLabelText("Tool type"), {
    target: { value: "chat" },
  });
  expect(screen.getByLabelText("Topic")).toBeDefined();
  expect(screen.getByText("Chat Sessions")).toBeDefined();
  expect(screen.queryByLabelText("Chat message")).toBeNull();
});

test("generate quiz posts selected options and supports interactive answering", async () => {
  listGenerations.mockResolvedValue([]);
  generateAll.mockResolvedValue(QUIZ_RESULT);

  renderPage();

  fireEvent.change(screen.getByLabelText("Tool type"), {
    target: { value: "quiz" },
  });
  fireEvent.change(screen.getByLabelText("Questions"), {
    target: { value: "8" },
  });
  fireEvent.change(screen.getByLabelText("Difficulty"), {
    target: { value: "hard" },
  });
  const topic = "Newton's Law of Universal Gravitation";
  fireEvent.change(screen.getByLabelText("Topic"), {
    target: { value: topic },
  });
  fireEvent.click(screen.getByRole("button", { name: /generate/i }));

  await waitFor(() =>
    expect(generateAll).toHaveBeenCalledWith(topic, "quiz", {
      num_questions: 8,
      difficulty: "hard",
    })
  );
  await screen.findByText("What is gravity?");

  // answer, submit, and see the score
  fireEvent.click(screen.getByRole("button", { name: "A) force" }));
  fireEvent.click(screen.getByRole("button", { name: /submit quiz/i }));

  await screen.findByText("100%");
  expect(screen.getByText(/because physics/i)).toBeDefined();
});

test("chat mode sends message with history and appends replies", async () => {
  listGenerations.mockResolvedValue([]);
  generateAll
    .mockResolvedValueOnce({ reply: "first reply", generation_id: 1 })
    .mockResolvedValueOnce({ reply: "second reply", generation_id: 2 });

  renderPage();

  fireEvent.change(screen.getByLabelText("Tool type"), {
    target: { value: "chat" },
  });

  // Type a topic and click Start Chat to begin the conversation
  fireEvent.change(screen.getByLabelText("Topic"), {
    target: { value: "hello" },
  });
  fireEvent.click(screen.getByRole("button", { name: /start chat/i }));

  await waitFor(() =>
    expect(generateAll).toHaveBeenCalledWith("hello", "chat", { history: [] })
  );
  await screen.findByText("first reply");

  // Continue chatting in the chat panel
  fireEvent.change(screen.getByLabelText("Chat message"), {
    target: { value: "more" },
  });
  fireEvent.keyDown(screen.getByLabelText("Chat message"), { key: "Enter" });

  await waitFor(() =>
    expect(generateAll).toHaveBeenLastCalledWith("more", "chat", {
      history: [
        { role: "user", content: "hello" },
        { role: "assistant", content: "first reply" },
      ],
    })
  );
  await screen.findByText("second reply");
});

test("clicking a saved history item reopens its stored result", async () => {
  listGenerations.mockResolvedValue([
    {
      id: 1,
      type: "chat",
      topic: "what is inertia",
      result: { reply: "stored reply" },
      created_at: "2026-01-01T00:00:00Z",
    },
  ]);

  renderPage();

  await screen.findByText("what is inertia");
  fireEvent.click(screen.getByText("what is inertia"));

  await screen.findByText("stored reply");
  expect(screen.getByTitle("Read aloud")).toBeDefined(); // TTS available
});

test("deleting a saved generation removes it from saved history", async () => {
  // `rows` stands in for the server table so the refetch after deletion
  // returns the shrunken list, exactly like the real endpoint.
  let rows = [
    {
      id: 1,
      type: "explain",
      topic: "gravity",
      result: { explanation: "old result" },
      created_at: "2026-01-01T00:00:00Z",
    },
  ];
  listGenerations.mockImplementation(() => Promise.resolve(rows));
  deleteGeneration.mockImplementation(async (id) => {
    rows = rows.filter((r) => r.id !== id);
  });
  jest.spyOn(window, "confirm").mockReturnValue(true);

  renderPage();
  await screen.findByText("gravity");

  fireEvent.click(screen.getByRole("button", { name: /delete saved explain generation/i }));

  await waitFor(() => expect(deleteGeneration).toHaveBeenCalledWith(1));
  await waitFor(() => expect(screen.queryByText("gravity")).toBeNull());
  expect(screen.getByText(/No saved generations yet/i)).toBeDefined();
});

test("dismissing the delete confirmation keeps the generation", async () => {
  listGenerations.mockResolvedValue([
    {
      id: 1,
      type: "explain",
      topic: "gravity",
      result: { explanation: "old result" },
      created_at: "2026-01-01T00:00:00Z",
    },
  ]);
  jest.spyOn(window, "confirm").mockReturnValue(false);

  renderPage();
  await screen.findByText("gravity");

  fireEvent.click(screen.getByRole("button", { name: /delete saved explain generation/i }));

  expect(deleteGeneration).not.toHaveBeenCalled();
  expect(screen.getByText("gravity")).toBeDefined();
});

test("delete control does not open the generation behind it", async () => {
  listGenerations.mockResolvedValue([
    {
      id: 1,
      type: "quiz",
      topic: "gravity",
      result: { questions: [{ id: 1, question: "Q?", options: [], answer: "A", explanation: "e" }] },
      created_at: "2026-01-01T00:00:00Z",
    },
  ]);
  jest.spyOn(window, "confirm").mockReturnValue(false);

  renderPage();
  await screen.findByText("gravity");

  fireEvent.click(screen.getByRole("button", { name: /delete saved quiz generation/i }));

  // The Card's own click handler must not fire, so no result panel appears.
  expect(screen.queryByText("Q?")).toBeNull();
});
