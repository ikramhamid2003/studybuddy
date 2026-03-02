import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 90000, // 90s — HF cold start can be slow
});

// Response interceptor for cleaner errors
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg =
      err.response?.data?.error ||
      err.response?.data?.detail ||
      err.message ||
      "Something went wrong";
    return Promise.reject(new Error(msg));
  }
);

export const explainTopic = (topic, level) =>
  api.post("/explain/", { topic, level });

export const summarizeNotes = (notes, format = "bullets") =>
  api.post("/summarize/", { notes, format });

export const generateQuiz = (topic, num_questions, difficulty) =>
  api.post("/quiz/", { topic, num_questions, difficulty });

export const generateFlashcards = (topic, num_cards) =>
  api.post("/flashcards/", { topic, num_cards });

export const sendChat = (message, history) =>
  api.post("/chat/", { message, history });

export default api;
