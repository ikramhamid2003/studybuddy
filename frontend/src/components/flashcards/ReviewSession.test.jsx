import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import ReviewSession from "./ReviewSession";
import { fetchDueCards, submitCardReview } from "../../utils/api";

vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../../utils/api", () => ({
  fetchDueCards: vi.fn(),
  submitCardReview: vi.fn(),
}));

const card = (i, extra = {}) => ({
  generation_id: 7,
  card_index: i,
  topic: "Biology",
  front: `Question ${i}`,
  back: `Answer ${i}`,
  hint: `Hint ${i}`,
  is_new: true,
  due_at: null,
  ...extra,
});

function setup(cards, onExit = vi.fn()) {
  fetchDueCards.mockResolvedValue({ cards, due_count: 0, new_count: cards.length });
  submitCardReview.mockResolvedValue({});
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <ReviewSession generationId={7} onExit={onExit} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return onExit;
}

beforeEach(() => vi.clearAllMocks());

test("shows the question first and only reveals the answer on request", async () => {
  setup([card(0)]);
  expect(await screen.findByText("Question 0")).toBeInTheDocument();
  expect(screen.queryByText("Answer 0")).not.toBeInTheDocument();
  expect(fetchDueCards).toHaveBeenCalledWith({ generationId: 7 });

  fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
  expect(screen.getByText("Answer 0")).toBeInTheDocument();
  expect(screen.getByRole("group", { name: /How well did you remember/ })).toBeInTheDocument();
});

test("rating sends the review and moves to the next card", async () => {
  setup([card(0), card(1)]);
  await screen.findByText("Question 0");
  fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
  fireEvent.click(screen.getByRole("button", { name: /Good/ }));

  await screen.findByText("Question 1");
  expect(submitCardReview).toHaveBeenCalledWith(7, 0, "good");
  expect(screen.queryByText("Answer 0")).not.toBeInTheDocument();
});

test("number keys rate the card once the answer is showing", async () => {
  setup([card(0), card(1)]);
  await screen.findByText("Question 0");
  fireEvent.keyDown(document, { key: "3" }); // ignored: answer not showing
  expect(submitCardReview).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
  fireEvent.keyDown(document, { key: "4" });
  await waitFor(() => expect(submitCardReview).toHaveBeenCalledWith(7, 0, "easy"));
});

test("a card rated Again comes back at the end of the session", async () => {
  setup([card(0), card(1)]);
  await screen.findByText("Question 0");
  fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
  fireEvent.click(screen.getByRole("button", { name: /Again/ }));

  await screen.findByText("Question 1");
  fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
  fireEvent.click(screen.getByRole("button", { name: /Easy/ }));

  expect(await screen.findByText("Question 0")).toBeInTheDocument();
});

test("finishing the queue shows a summary and a way back", async () => {
  const onExit = setup([card(0)]);
  await screen.findByText("Question 0");
  fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
  fireEvent.click(screen.getByRole("button", { name: /Good/ }));

  expect(await screen.findByText("Session complete")).toBeInTheDocument();
  expect(screen.getByText(/You reviewed 1 card: 0 easy, 1 good/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to flashcards" }));
  expect(onExit).toHaveBeenCalled();
});

test("an empty queue says nothing is due", async () => {
  setup([]);
  expect(await screen.findByText("Nothing due right now")).toBeInTheDocument();
});

test("a failed save keeps the card so it can be retried", async () => {
  setup([card(0)]);
  await screen.findByText("Question 0");
  submitCardReview.mockRejectedValueOnce(new Error("boom"));
  fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
  fireEvent.click(screen.getByRole("button", { name: /Hard/ }));

  await waitFor(() => expect(submitCardReview).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole("button", { name: /Hard/ })).not.toBeDisabled());
  expect(screen.getByText("Answer 0")).toBeInTheDocument();
});
