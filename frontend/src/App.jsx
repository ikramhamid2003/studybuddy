import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import AllPage from "./pages/AllPage";
import ExplainPage from "./pages/ExplainPage";
import SummarizePage from "./pages/SummarizePage";
import QuizPage from "./pages/QuizPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import { AuthProvider, useAuth } from "./context/AuthContext";

const queryClient = new QueryClient();

// Keeps private study tools behind authentication while the current session is
// still being restored from local storage.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-sm">
        Loading session...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Prevents signed-in users from seeing login/register screens again.
function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-sm">
        Loading session...
      </div>
    );
  }
  if (user) {
    return <Navigate to="/explain" replace />;
  }
  return children;
}

export default function App() {
  useEffect(() => {
    // CSS variables drive the ambient cursor glow used by the app shell.
    const handleMouseMove = (e) => {
      document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="cursor-glow-container relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 z-0 cursor-glow-element" />
      <div className="relative z-10">
        {/* Providers wrap routing so every page can share auth, cache, and toasts. */}
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
          {/* Toast styling is centralized so every page uses the same feedback UI. */}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#1e293b",
                color: "#f1f5f9",
                border: "1px solid #334155",
                borderRadius: "12px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
              },
              success: { iconTheme: { primary: "#fbbf24", secondary: "#0f172a" } },
              error: { iconTheme: { primary: "#f43f5e", secondary: "#0f172a" } },
            }}
          />
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            
            {/* Protected Workspace Pages */}
            <Route
              path="/all"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ErrorBoundary>
                      <AllPage />
                    </ErrorBoundary>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/explain"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ErrorBoundary>
                      <ExplainPage />
                    </ErrorBoundary>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/summarize"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ErrorBoundary>
                      <SummarizePage />
                    </ErrorBoundary>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ErrorBoundary>
                      <QuizPage />
                    </ErrorBoundary>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/flashcards"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ErrorBoundary>
                      <FlashcardsPage />
                    </ErrorBoundary>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ErrorBoundary>
                      <ChatPage />
                    </ErrorBoundary>
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Analytics />
          <SpeedInsights />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
      </div>
    </div>
  );
}
