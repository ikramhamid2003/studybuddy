import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// The library hook reads its owner from auth, so the account switch is driven
// through a mock user rather than a real login.
let mockUser = { id: 3, username: "ada" };
jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, token: "x", loading: false }),
}));

let mockDocs = [{ id: 9, title: "Notes", status: "ready" }];
jest.mock("../../utils/api", () => ({
  listDocuments: () => Promise.resolve(mockDocs),
  deleteDocument: jest.fn(),
  uploadDocument: jest.fn(),
  validateRagFile: jest.fn(() => null),
}));

const { useDocumentLibrary, MAX_SELECTED_DOCS, docIdsOption } = require("./documentLibrary");

// Private to the module on purpose; mirrored here because it is what leaks
// across accounts when nothing clears it.
const SELECTION_KEY = "studybuddy.selectedDocumentIds";

function wrapper({ children }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

// Documents are listed newest first, which is the order the cap keeps a
// selection inside.
const docs = (ids) => ids.map((id) => ({ id, title: `Doc ${id}`, status: "ready" }));

beforeEach(() => {
  localStorage.clear();
  mockUser = { id: 3, username: "ada" };
  mockDocs = docs([9]);
});

describe("document selection ownership", () => {
  test("a different account starts from an empty selection", async () => {
    // Ids are primary keys of the previous owner's uploads. Sent unchanged, they
    // would either be refused or ground a generation in someone else's text.
    localStorage.setItem(SELECTION_KEY, JSON.stringify([9]));
    const { result, rerender } = renderHook(() => useDocumentLibrary(), { wrapper });

    await waitFor(() => expect([...result.current.selectedIds]).toEqual([9]));

    mockUser = { id: 4, username: "bob" };
    rerender();

    await waitFor(() => expect([...result.current.selectedIds]).toEqual([]));
    expect(JSON.parse(localStorage.getItem(SELECTION_KEY))).toEqual([]);
  });

  test("the same account keeps its selection", async () => {
    // The reset must fire on an owner change only: a plain re-render happens on
    // every query update, and clearing there would drop the user's workspace.
    localStorage.setItem(SELECTION_KEY, JSON.stringify([9]));
    const { result, rerender } = renderHook(() => useDocumentLibrary(), { wrapper });

    await waitFor(() => expect([...result.current.selectedIds]).toEqual([9]));
    rerender();
    rerender();

    expect([...result.current.selectedIds]).toEqual([9]);
    expect(JSON.parse(localStorage.getItem(SELECTION_KEY))).toEqual([9]);
  });
});

describe("document selection cap", () => {
  test("a 26th manual tick is refused instead of sent", async () => {
    // The serializer caps document_ids at 25, and a request that trips it comes
    // back as DRF's unlabeled "Ensure this field has no more than 25 elements".
    mockDocs = docs(Array.from({ length: 30 }, (_, i) => 30 - i));
    const { result } = renderHook(() => useDocumentLibrary(), { wrapper });

    await waitFor(() => expect(result.current.documents).toHaveLength(30));
    act(() => result.current.selectAllReady(result.current.readyDocuments.map((d) => d.id)));
    expect(result.current.selectedIds.size).toBe(MAX_SELECTED_DOCS);

    act(() => result.current.toggleDoc(5)); // 5 is outside the kept set
    expect(result.current.selectedIds.size).toBe(MAX_SELECTED_DOCS);
    expect(result.current.selectedIds.has(5)).toBe(false);
    expect(docIdsOption(result.current.selectedIds).document_ids).toHaveLength(MAX_SELECTED_DOCS);

    // Refusing the add must never refuse the remove.
    act(() => result.current.toggleDoc(30));
    expect(result.current.selectedIds.has(30)).toBe(false);
    act(() => result.current.toggleDoc(5));
    expect(result.current.selectedIds.has(5)).toBe(true);
  });

  test("a stored selection over the cap shrinks on load", async () => {
    // Reachable only from a build that had no cap, but the next generation would
    // 400 until the user worked out which box to untick. Self-heal instead.
    mockDocs = docs(Array.from({ length: 30 }, (_, i) => 30 - i));
    const overCap = Array.from({ length: MAX_SELECTED_DOCS + 1 }, (_, i) => i + 1);
    localStorage.setItem(SELECTION_KEY, JSON.stringify(overCap));

    const { result } = renderHook(() => useDocumentLibrary(), { wrapper });

    await waitFor(() => expect(result.current.selectedIds.size).toBe(MAX_SELECTED_DOCS));
    // The oldest ids go, matching how "select all" fills the cap.
    expect(result.current.selectedIds.has(overCap[0])).toBe(false);
    expect(result.current.selectedIds.has(overCap[MAX_SELECTED_DOCS - 1])).toBe(true);
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(SELECTION_KEY))).toHaveLength(MAX_SELECTED_DOCS)
    );
  });
});
