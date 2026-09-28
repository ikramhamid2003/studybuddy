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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (user) {
    return <Navigate to="/explain" replace />;
  }
  return children;
}

export default function App() {
  // No ambient glow needed in the NotebookLM light theme.

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10">
        {/* Providers wrap routing so every page can share auth, cache, and toasts. */}
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
          {/* Toast styling — light NotebookLM palette. */}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#ffffff",
                color: "#0f172a",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
              },
              success: { iconTheme: { primary: "#4f46e5", secondary: "#ffffff" } },
              error: { iconTheme: { primary: "#e11d48", secondary: "#ffffff" } },
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
