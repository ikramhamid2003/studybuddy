import { createContext, useState, useEffect, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchCurrentUser, SESSION_EXPIRED_EVENT } from "../utils/api";

const AuthContext = createContext(null);

const DEFAULT_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://studybuddy-api-hkgx.onrender.com/api"
    : "http://localhost:8000/api";

const BASE_URL = process.env.REACT_APP_API_URL || DEFAULT_API_URL;

// Auth endpoints answer an invalid payload with DRF's field-error dict, so the
// only human-readable reason sits under whichever key the server chose to
// reject — {"email": ["Enter a valid email address."]} or {"non_field_errors":
// [...]}. Reading just `detail` (or just `username`) threw that reason away and
// left the student with a generic label they could only diagnose in devtools.
function rejectionMessage(json, fallback) {
  if (typeof json?.detail === "string") return json.detail;
  for (const value of Object.values(json ?? {})) {
    const reason = Array.isArray(value) ? value[0] : value;
    if (typeof reason === "string" && reason) return reason;
  }
  return fallback;
}

export function AuthProvider({ children }) {
  // The access token is the single source of truth; user state is derived from
  // the JWT payload whenever the token changes.
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  // React Query caches by query key, not by account. Without this, the next
  // student to sign in on the same browser reads the previous one's generations,
  // documents and usage out of memory until each query refetches. Losing the
  // token covers logout, a rejected refresh, and an undecodable token alike.
  useEffect(() => {
    if (!token) queryClient.clear();
  }, [token, queryClient]);

  useEffect(() => {
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
      localStorage.removeItem("token");
      localStorage.removeItem("refresh");
      setToken(null);
      setUser(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);

  async function login(username, password) {
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
