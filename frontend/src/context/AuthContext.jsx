import { createContext, useState, useEffect, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchCurrentUser, rejectionMessage, SESSION_EXPIRED_EVENT } from "../utils/api";
import {
  API_BASE_URL as BASE_URL,
  CLIENT_HEADERS,
  COOKIE_MODE,
  cookieInit,
  discardLegacyTokens,
  readIdentity,
  writeIdentity,
} from "../utils/session";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // The access token is the single source of truth; user state is derived from
  // the JWT payload whenever the token changes.
  const queryClient = useQueryClient();
  // In cookie mode the tokens are httpOnly cookies this code cannot see; "signed
  // in" is then the cached identity, confirmed against the API on load.
  const [user, setUser] = useState(() => (COOKIE_MODE ? readIdentity() : null));
  const [token, setToken] = useState(() => (COOKIE_MODE ? null : localStorage.getItem("token")));
  const [loading, setLoading] = useState(true);

  // React Query caches by query key, not by account. Without this, the next
  // student to sign in on the same browser reads the previous one's generations,
  // documents and usage out of memory until each query refetches. Losing the
  // token covers logout, a rejected refresh, and an undecodable token alike.
  useEffect(() => {
    if (COOKIE_MODE ? !user && !loading : !token) queryClient.clear();
  }, [token, user, loading, queryClient]);

  // Cookie mode: confirm the cached identity still has a live session.
  useEffect(() => {
    if (!COOKIE_MODE) return;
    discardLegacyTokens();
    if (!readIdentity()) {
      setLoading(false);
      return;
    }
    fetchCurrentUser()
      .then((me) => {
        const identity = { id: me.id, username: me.username };
        writeIdentity(identity);
        setUser(identity);
      })
      .catch((error) => {
        // Offline is not the same as signed out: keep the cached identity.
        if (error instanceof TypeError) return;
        writeIdentity(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (COOKIE_MODE) return;
    if (token) {
      localStorage.setItem("token", token);
      try {
        // Decode the lightweight identity fields needed by the UI.
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({ id: payload.user_id, username: payload.username || "" });
        if (!payload.username) {
          // Access tokens issued before the username claim only carry user_id,
          // so an already signed-in session recovers the handle from the API
          // rather than showing a generic label until the next login.
          fetchCurrentUser()
            .then((me) =>
              setUser((current) =>
                current && current.id === payload.user_id
                  ? { id: me.id, username: me.username }
                  : current,
              ),
            )
            .catch(() => {
              // Left unresolved, the UI keeps its fallback label.
            });
        }
      } catch (e) {
        console.error("Failed to decode token:", e);
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      }
    } else {
      localStorage.removeItem("token");
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    // The API client renews the access token on its own; this event means the
    // refresh token was also rejected, so the session is genuinely over and the
    // route guards have to return the app to guest state.
    const onSessionExpired = () => {
      writeIdentity(null);
      localStorage.removeItem("token");
      localStorage.removeItem("refresh");
      setToken(null);
      setUser(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);

  async function login(username, password) {
    if (COOKIE_MODE) {
      const res = await fetch(`${BASE_URL}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...CLIENT_HEADERS },
        body: JSON.stringify({ username, password }),
        ...cookieInit,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.user) {
        throw new Error(rejectionMessage(json, "Invalid credentials"));
      }
      // The tokens are now in httpOnly cookies; only the identity is kept here.
      writeIdentity(json.user);
      setUser(json.user);
      return json;
    }

    try {
      const res = await fetch(`${BASE_URL}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok || !json) {
        throw new Error(rejectionMessage(json, "Invalid credentials"));
      }
      const access = json.access;
      localStorage.setItem("token", access);
      // The refresh token is what logout revokes, so it has to be kept too.
      if (json.refresh) localStorage.setItem("refresh", json.refresh);
      setToken(access);
      try {
        const payload = JSON.parse(atob(access.split(".")[1]));
        setUser({ id: payload.user_id, username: payload.username || "Student" });
      } catch (e) {
        console.error("Failed to decode token:", e);
      }
      return json;
    } catch (error) {
      const msg = error.message || "Invalid credentials";
      throw new Error(msg);
    }
  }

  async function register(username, email, password) {
    try {
      // Register first, then reuse login so token handling stays in one place.
      const response = await fetch(`${BASE_URL}/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(rejectionMessage(json, "Registration failed"));
      }
      await login(username, password);
    } catch (error) {
      const msg = error.message || "Registration failed";
      throw new Error(msg);
    }
  }

  async function logout() {
    if (COOKIE_MODE) {
      try {
        // The server revokes the refresh token and expires both cookies.
        await fetch(`${BASE_URL}/auth/logout/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...CLIENT_HEADERS },
          body: "{}",
          ...cookieInit,
        });
      } catch {
        // Even if the revoke call fails, clear local state.
      }
      writeIdentity(null);
      setUser(null);
      return;
    }

    // Revoke the refresh token before clearing local state. The action is
    // public because the refresh token is the credential, and it must work even
    // when the access token has already expired.
    const refresh = localStorage.getItem("refresh");
    if (refresh) {
      try {
        await fetch(`${BASE_URL}/token/blacklist/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
      } catch (e) {
        // Even if the revoke call fails, clear local state.
      }
    }
    // Clearing the token automatically returns the app to guest state.
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
  }

  return (
    // Expose auth state and actions from one place so route guards and forms
    // never touch localStorage directly.
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  // Fail loudly when a component is mounted outside AuthProvider.
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
