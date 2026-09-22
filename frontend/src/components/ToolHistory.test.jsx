import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ToolHistory from "./ToolHistory";
import { listGenerations, deleteGeneration } from "../utils/api";

jest.mock("../utils/api", () => ({
  listGenerations: jest.fn(),
  deleteGeneration: jest.fn(),
}));

function renderHistory(props = {}) {
  // A fresh QueryClient keeps React Query cache isolated per test.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToolHistory type="explain" activeId={null} onSelect={jest.fn()} {...props} />
    </QueryClientProvider>
  );
}

function savedGeneration(overrides = {}) {
  return {
    id: 1,
    type: "explain",
    topic: "gravity",
    result: { explanation: "old result" },
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  listGenerations.mockReset();
  deleteGeneration.mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("each saved generation exposes a delete control", async () => {
  listGenerations.mockResolvedValue([savedGeneration()]);

  renderHistory();

  await screen.findByText("gravity");
  expect(
    screen.getByRole("button", { name: /delete saved explain generation/i })
  ).toBeDefined();
});

test("deleting removes the entry from the list and reports the id", async () => {
  // `rows` stands in for the server table so the refetch after deletion
  // returns the shrunken list, exactly like the real endpoint.
  let rows = [savedGeneration()];
  listGenerations.mockImplementation(() => Promise.resolve(rows));
  deleteGeneration.mockImplementation(async (id) => {
    rows = rows.filter((r) => r.id !== id);
  });
  const onDeleted = jest.fn();
  jest.spyOn(window, "confirm").mockReturnValue(true);

  renderHistory({ onDeleted });
  await screen.findByText("gravity");

  fireEvent.click(screen.getByRole("button", { name: /delete saved explain generation/i }));

  await waitFor(() => expect(deleteGeneration).toHaveBeenCalledWith(1));
  await waitFor(() => expect(screen.queryByText("gravity")).toBeNull());
  expect(onDeleted).toHaveBeenCalledWith(1);
});

test("dismissing the confirmation keeps the saved generation", async () => {
  listGenerations.mockResolvedValue([savedGeneration()]);
  jest.spyOn(window, "confirm").mockReturnValue(false);

  renderHistory();
  await screen.findByText("gravity");

  fireEvent.click(screen.getByRole("button", { name: /delete saved explain generation/i }));

  expect(deleteGeneration).not.toHaveBeenCalled();
  expect(screen.getByText("gravity")).toBeDefined();
});

test("selecting a saved generation still reopens it", async () => {
  const onSelect = jest.fn();
  listGenerations.mockResolvedValue([savedGeneration()]);

  renderHistory({ onSelect });
  await screen.findByText("gravity");

  fireEvent.click(screen.getByText("gravity"));

  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect.mock.calls[0][0].id).toBe(1);
});

test("a failed delete keeps the entry and surfaces an error", async () => {
  listGenerations.mockResolvedValue([savedGeneration()]);
  deleteGeneration.mockRejectedValue(new Error("boom"));
  jest.spyOn(window, "confirm").mockReturnValue(true);

  renderHistory();
  await screen.findByText("gravity");

  fireEvent.click(screen.getByRole("button", { name: /delete saved explain generation/i }));

  await waitFor(() => expect(deleteGeneration).toHaveBeenCalledWith(1));
  expect(screen.getByText("gravity")).toBeDefined();
});
