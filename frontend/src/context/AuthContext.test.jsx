import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./AuthContext";

const realFetch = global.fetch;

// AuthProvider only reads the payload for the UI identity fields, so a
// signature-less JWT shape is enough to stand in for a real token.
const jwtFor = (payload) => `x.${btoa(JSON.stringify(payload))}.y`;

const makeWrapper = (queryClient) =>
  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };

const newQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const cachedKeys = (queryClient) =>
  queryClient.getQueryCache().getAll().map((q) => q.queryKey.join("/"));

describe("session teardown", () => {
  afterEach(() => {
    global.fetch = realFetch;
    localStorage.clear();
  });

  test("logout empties the query cache the next account would otherwise inherit", async () => {
    localStorage.setItem("token", jwtFor({ user_id: 3, username: "ada" }));
    localStorage.setItem("refresh", "refresh-token");
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const queryClient = newQueryClient();
    queryClient.setQueryData(["generations", "explain"], [{ id: 1, topic: "private" }]);
    queryClient.setQueryData(["rag_documents"], [{ id: 9, title: "private notes" }]);
    queryClient.setQueryData(["usage_stats"], { total_tokens: 4000 });

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(queryClient) });

    await act(() => result.current.logout());

    expect(cachedKeys(queryClient)).toEqual([]);
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("refresh")).toBeNull();
    // The refresh token is revoked server-side, not just dropped locally.
    expect(global.fetch.mock.calls[0][0]).toContain("/token/blacklist/");
  });

  test("a rejected session clears the cache without any logout click", async () => {
    // Covers the paths that lose the token on their own: a refresh that the
    // server refuses and a stored token this app can no longer decode.
    localStorage.setItem("token", "not-a-jwt");
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const queryClient = newQueryClient();
    queryClient.setQueryData(["generations"], [{ id: 1 }]);

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(queryClient) });

    await waitFor(() => expect(result.current.user).toBeNull());
    expect(cachedKeys(queryClient)).toEqual([]);
    consoleError.mockRestore();
  });

  test("a live session keeps whatever the cache already holds", async () => {
    // Guards against clearing on every render: wiping the cache while signed in
    // would throw away the data the dashboard is displaying.
    localStorage.setItem("token", jwtFor({ user_id: 3, username: "ada" }));
    const queryClient = newQueryClient();
    queryClient.setQueryData(["generations"], [{ id: 1 }]);

    renderHook(() => useAuth(), { wrapper: makeWrapper(queryClient) });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(cachedKeys(queryClient)).toEqual(["generations"]);
  });
});
