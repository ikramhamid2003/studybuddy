import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Layout from "./components/Layout";
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Protected Workspace Pages */}
            <Route
              path="/explain"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ExplainPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/summarize"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SummarizePage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz"
              element={
                <ProtectedRoute>
                  <Layout>
                    <QuizPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/flashcards"
              element={
                <ProtectedRoute>
                  <Layout>
                    <FlashcardsPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ChatPage />
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
  );
}
