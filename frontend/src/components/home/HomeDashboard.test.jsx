import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import HomeDashboard from "./HomeDashboard";
import { fetchUsageStats, listChatSessions, listDocuments, listGenerations } from "../../utils/api";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 3, username: "Ada" } }),
}));

vi.mock("../../utils/api", () => ({
  fetchUsageStats: vi.fn(),
  listChatSessions: vi.fn(),
  listDocuments: vi.fn(),
  listGenerations: vi.fn(),
}));

const usage = {
  total_input_tokens: 100,
  total_output_tokens: 50,
  total_estimated_cost: 0.01,
  daily_token_limit: 10000,
  tokens_used_today: 150,
  tokens_remaining_today: 9850,
};
const generations = [{ id: 1, topic: "Gravity notes", type: "explain", created_at: new Date().toISOString() }];
let queryClient;

function renderDashboard() {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <HomeDashboard />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function section(title) {
  return within(screen.getByRole("heading", { name: title }).closest("section"));
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  listGenerations.mockResolvedValue([]);
  listChatSessions.mockResolvedValue([]);
  listDocuments.mockResolvedValue([]);
  fetchUsageStats.mockResolvedValue(usage);
});

afterEach(() => queryClient.clear());

test("shows genuine empty states only after successful loads", async () => {
  renderDashboard();
  expect(await screen.findByText(/Nothing saved yet/)).toBeInTheDocument();
  expect(section("Recent conversations").getByText(/No saved conversations yet/)).toBeInTheDocument();
  expect(section("Document library").getByText(/Upload a PDF/)).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("does not report an empty account while requests are pending", () => {
  [listGenerations, listChatSessions, listDocuments, fetchUsageStats].forEach((fetchData) => {
    fetchData.mockReturnValue(new Promise(() => {}));
  });
  renderDashboard();
  expect(screen.queryByText(/Nothing saved yet/)).not.toBeInTheDocument();
  expect(screen.queryByText(/No saved conversations yet/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Upload a PDF/)).not.toBeInTheDocument();
  expect(screen.queryByText(/each tick comes from/)).not.toBeInTheDocument();
});

test.each([
  [listGenerations, "Saved results", /Nothing saved yet/],
  [listChatSessions, "Conversations", /No saved conversations yet/],
  [listDocuments, "Documents", /Upload a PDF/],
  [fetchUsageStats, "Usage", /150 of 10K used/],
])("reports a failed %s request without an empty-data claim", async (fetchData, label, emptyText) => {
  fetchData.mockRejectedValue(new Error(`${label} offline`));
  renderDashboard();
  const alert = await screen.findByRole("alert");
  expect(within(alert).getByText(`${label} offline`, { exact: false })).toBeInTheDocument();
  expect(screen.queryByText(emptyText)).not.toBeInTheDocument();
});

test.each([
  [listGenerations, "Saved this week"],
  [fetchUsageStats, "Tokens used"],
])("does not invent a zero for failed %s metrics", async (fetchData, label) => {
  fetchData.mockRejectedValue(new Error("Offline"));
  renderDashboard();
  await screen.findByRole("alert");
  expect(within(screen.getByRole("group", { name: label })).getByText("—")).toBeInTheDocument();
});

test.each([listGenerations, listChatSessions, listDocuments])(
  "does not infer setup or suggestions from failed %s data",
  async (fetchData) => {
    fetchData.mockRejectedValue(new Error("Offline"));
    renderDashboard();
    await screen.findByRole("alert");
    expect(screen.queryByText(/each tick comes from/)).not.toBeInTheDocument();
    expect(screen.queryByText("Suggested")).not.toBeInTheDocument();
  }
);

test("retries only failed requests and recovers without a page reload", async () => {
  listGenerations.mockRejectedValueOnce(new Error("History offline")).mockResolvedValue(generations);
  renderDashboard();
  fireEvent.click(within(await screen.findByRole("alert")).getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Gravity notes")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(listGenerations).toHaveBeenCalledTimes(2);
  expect(listChatSessions).toHaveBeenCalledTimes(1);
  expect(listDocuments).toHaveBeenCalledTimes(1);
  expect(fetchUsageStats).toHaveBeenCalledTimes(1);
});

test("keeps successful sections usable when another request fails", async () => {
  listGenerations.mockResolvedValue(generations);
  listChatSessions.mockResolvedValue([{ id: 2, title: "Physics chat", created_at: new Date().toISOString() }]);
  listDocuments.mockRejectedValue(new Error("Library offline"));
  renderDashboard();
  await screen.findByRole("alert");
  expect(screen.getByText("Gravity notes")).toBeInTheDocument();
  expect(screen.getByText("Physics chat")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "What are you studying today?" }), {
    target: { value: "quiz me on gravity" },
  });
  expect(screen.getByRole("button", { name: "Quiz" })).toBeEnabled();
});

test("retains cached results with a warning after a failed refresh", async () => {
  listGenerations.mockResolvedValueOnce(generations).mockRejectedValue(new Error("Refresh offline"));
  renderDashboard();
  await screen.findByText("Gravity notes");
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ["generations"] });
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("Refresh offline");
  expect(screen.getByText("Gravity notes")).toBeInTheDocument();
  expect(screen.queryByText(/Nothing saved yet/)).not.toBeInTheDocument();
  listGenerations.mockResolvedValue(generations);
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
});
