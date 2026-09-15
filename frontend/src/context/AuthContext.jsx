import { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({ id: payload.user_id, username: payload.username || "Student" });
      } catch (e) {
        console.error("Failed to decode token:", e);
        logout();
      }
    } else {
      localStorage.removeItem("token");
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  async function login(username, password) {
    try {
      const res = await fetch(`${BASE_URL}/unified/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        const msg = json.error || "Invalid credentials";
        throw new Error(msg);
      }
      const access = json.data.access;
      setToken(access);
      try {
        const payload = JSON.parse(atob(access.split(".")[1]));
        setUser({ id: payload.user_id, username: payload.username || "Student" });
      } catch (e) {
        console.error("Failed to decode token:", e);
      }
      return json.data;
    } catch (error) {
      const msg = error.message || "Invalid credentials";
      throw new Error(msg);
    }
  }

  async function register(username, email, password) {
    try {
      // Register first
      await fetch(`${BASE_URL}/unified/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", username, email, password }),
      });
      // Then auto-login
      await login(username, password);
    } catch (error) {
      const msg = error.message || "Registration failed";
      throw new Error(msg);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
