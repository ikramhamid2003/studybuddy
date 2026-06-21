import { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      // Basic decode of JWT payload to get user metadata
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({
          id: payload.user_id,
          username: payload.username || "Student",
        });
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
      const response = await axios.post(`${BASE_URL}/auth/login/`, {
        username,
        password,
      });
      setToken(response.data.access);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.detail || "Invalid credentials";
      throw new Error(msg);
    }
  }

  async function register(username, email, password) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/register/`, {
        username,
        email,
        password,
      });
      // Automatically log in after registration
      await login(username, password);
      return response.data;
    } catch (error) {
      const data = error.response?.data || {};
      const firstError = Object.values(data)[0];
      const msg = Array.isArray(firstError) ? firstError[0] : "Registration failed";
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
