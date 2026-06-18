import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import Layout from "./components/Layout";
import ExplainPage from "./pages/ExplainPage";
import SummarizePage from "./pages/SummarizePage";
import QuizPage from "./pages/QuizPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import ChatPage from "./pages/ChatPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/explain" replace />} />
            <Route path="/explain" element={<ExplainPage />} />
            <Route path="/summarize" element={<SummarizePage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/flashcards" element={<FlashcardsPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Routes>
        </Layout>
        <Analytics />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
