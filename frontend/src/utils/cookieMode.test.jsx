import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Cookie mode is chosen at import time from the API URL, so each test loads
// fresh copies of the modules with a relative URL.
async function loadCookieMode() {
  vi.resetModules();
  vi.stubEnv("REACT_APP_API_URL", "/api");
  const api = await import("./api");
  const auth = await import("../context/AuthContext");
  return { api, ...auth };
}

const realFetch = global.fetch;
const ok = (json = {}, status = 200) => ({ ok: status < 400, status, json: async () => json });

const wrapperFor = (AuthProvider, queryClient) =>
  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };

afterEach(() => {
  global.fetch = realFetch;
  localStorage.clear();
  vi.unstubAllEnvs();
});

describe("API client in cookie mode", () => {
  test("sends cookies and the client header, never a bearer token", async () => {
    localStorage.setItem("token", "stale-legacy-token");
    const { api } = await loadCookieMode();
    global.fetch = vi.fn().mockResolvedValue(ok({ id: 1, username: "ada" }));

    await api.fetchCurrentUser();

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("/api/auth/me/");
    expect(init.credentials).toBe("include");
    expect(init.headers["X-StudyBuddy-Client"]).toBe("web");
    expect(init.headers.Authorization).toBeUndefined();
  });

  test("a 401 renews the session through the cookie and retries once", async () => {
    const { api } = await loadCookieMode();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(ok({}, 401))
      .mockResolvedValueOnce(ok({ detail: "Session renewed." }))
      .mockResolvedValueOnce(ok({ id: 1, username: "ada" }));

    await expect(api.fetchCurrentUser()).resolves.toEqual({ id: 1, username: "ada" });

    const [refreshUrl, refreshInit] = global.fetch.mock.calls[1];
    expect(refreshUrl).toBe("/api/auth/refresh/");
    expect(refreshInit.body).toBe("{}");
    expect(refreshInit.credentials).toBe("include");
  });

  test("when renewal fails the session is declared expired", async () => {
    const { api } = await loadCookieMode();
    const expired = vi.fn();
    window.addEventListener(api.SESSION_EXPIRED_EVENT, expired);
    global.fetch = vi.fn().mockResolvedValue(ok({}, 401));

    await expect(api.fetchCurrentUser()).rejects.toThrow(/Session expired/);
    expect(expired).toHaveBeenCalled();
    window.removeEventListener(api.SESSION_EXPIRED_EVENT, expired);
  });
});

describe("AuthContext in cookie mode", () => {
  test("login keeps only the identity; no token is written anywhere readable", async () => {
    const { AuthProvider, useAuth } = await loadCookieMode();
    global.fetch = vi.fn().mockResolvedValue(ok({ user: { id: 4, username: "ada" } }));
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(AuthProvider, queryClient) });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.login("ada", "pw"));

    expect(result.current.user).toEqual({ id: 4, username: "ada" });
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("refresh")).toBeNull();
    expect(JSON.parse(localStorage.getItem("studybuddy_identity"))).toEqual({ id: 4, username: "ada" });
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("/api/auth/login/");
    expect(init.credentials).toBe("include");
  });

  test("a rejected login surfaces the server's message", async () => {
    const { AuthProvider, useAuth } = await loadCookieMode();
    global.fetch = vi.fn().mockResolvedValue(ok({ detail: "Bad credentials." }, 401));
    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperFor(AuthProvider, new QueryClient()),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.login("ada", "nope")).rejects.toThrow("Bad credentials.");
    expect(result.current.user).toBeNull();
  });

  test("logout revokes server-side, clears identity and empties the query cache", async () => {
    localStorage.setItem("studybuddy_identity", JSON.stringify({ id: 4, username: "ada" }));
    const { AuthProvider, useAuth } = await loadCookieMode();
    global.fetch = vi.fn().mockResolvedValue(ok({ id: 4, username: "ada" }));
    const queryClient = new QueryClient();
    queryClient.setQueryData(["generations"], [{ id: 1 }]);
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(AuthProvider, queryClient) });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.logout());

    expect(global.fetch.mock.calls.at(-1)[0]).toBe("/api/auth/logout/");
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("studybuddy_identity")).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
  });

  test("a cached identity is confirmed with the API on load", async () => {
    localStorage.setItem("studybuddy_identity", JSON.stringify({ id: 4, username: "old-name" }));
    const { AuthProvider, useAuth } = await loadCookieMode();
    global.fetch = vi.fn().mockResolvedValue(ok({ id: 4, username: "ada" }));
    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperFor(AuthProvider, new QueryClient()),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(global.fetch.mock.calls[0][0]).toBe("/api/auth/me/");
    expect(result.current.user).toEqual({ id: 4, username: "ada" });
  });

  test("an expired session drops the cached identity", async () => {
    localStorage.setItem("studybuddy_identity", JSON.stringify({ id: 4, username: "ada" }));
    const { AuthProvider, useAuth } = await loadCookieMode();
    global.fetch = vi.fn().mockResolvedValue(ok({}, 401));
    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperFor(AuthProvider, new QueryClient()),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("studybuddy_identity")).toBeNull();
  });

  test("being offline does not sign the user out", async () => {
    localStorage.setItem("studybuddy_identity", JSON.stringify({ id: 4, username: "ada" }));
    const { AuthProvider, useAuth } = await loadCookieMode();
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperFor(AuthProvider, new QueryClient()),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual({ id: 4, username: "ada" });
  });

  test("guests make no request on load, and old localStorage tokens are discarded", async () => {
    localStorage.setItem("token", "old");
    localStorage.setItem("refresh", "old");
    const { AuthProvider, useAuth } = await loadCookieMode();
    global.fetch = vi.fn();
    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperFor(AuthProvider, new QueryClient()),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("refresh")).toBeNull();
    expect(result.current.user).toBeNull();
  });
});
