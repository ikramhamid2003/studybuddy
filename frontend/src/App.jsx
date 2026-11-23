import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import HomePage from "./pages/HomePage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DocumentLibraryProvider } from "./context/DocumentLibraryContext";

// Each tool page loads on first visit instead of with the landing page. Chat
// alone pulls in the markdown renderer, so this keeps it off the first paint.
const AllPage = lazy(() => import("./pages/AllPage"));
const ExplainPage = lazy(() => import("./pages/ExplainPage"));
const SummarizePage = lazy(() => import("./pages/SummarizePage"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const FlashcardsPage = lazy(() => import("./pages/FlashcardsPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));

const queryClient = new QueryClient();

function PageSpinner() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center" role="status" aria-label="Loading">
      <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

// One shell for every signed-in tool page: auth gate, layout, error boundary.
function Workspace({ children }) {
  return (
    <ProtectedRoute>
      <Layout>
        <ErrorBoundary>{children}</ErrorBoundary>
      </Layout>
    </ProtectedRoute>
  );
}

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
          <DocumentLibraryProvider>
          <Suspense fallback={<PageSpinner />}>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            
            {/* Protected Workspace Pages */}
            <Route path="/all" element={<Workspace><AllPage /></Workspace>} />
            <Route path="/explain" element={<Workspace><ExplainPage /></Workspace>} />
            <Route path="/summarize" element={<Workspace><SummarizePage /></Workspace>} />
            <Route path="/quiz" element={<Workspace><QuizPage /></Workspace>} />
            <Route path="/flashcards" element={<Workspace><FlashcardsPage /></Workspace>} />
            <Route path="/chat" element={<Workspace><ChatPage /></Workspace>} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
          </DocumentLibraryProvider>
          <Analytics />
          <SpeedInsights />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
      </div>
    </div>
  );
}
