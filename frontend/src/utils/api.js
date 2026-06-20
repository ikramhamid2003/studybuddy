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

export const sendChatStream = async (message, history, onChunk, onDone, onError) => {
  try {
    const response = await fetch(`${BASE_URL}/chat/stream/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, history }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop(); // Keep partial line in buffer

      for (const line of lines) {
        const cleanLine = line.trim();
        if (cleanLine.startsWith("data: ")) {
          try {
            const data = JSON.parse(cleanLine.substring(6));
            if (data.error) {
              throw new Error(data.error);
            }
            if (data.chunk) {
              onChunk(data.chunk);
            }
          } catch (e) {
            console.error("Error parsing SSE chunk:", e);
          }
        }
      }
    }

    if (buffer.trim()) {
      const cleanLine = buffer.trim();
      if (cleanLine.startsWith("data: ")) {
        try {
          const data = JSON.parse(cleanLine.substring(6));
          if (data.error) {
            throw new Error(data.error);
          }
          if (data.chunk) {
            onChunk(data.chunk);
          }
        } catch (e) {
          console.error("Error parsing SSE chunk:", e);
        }
      }
    }

    onDone();
  } catch (error) {
    if (onError) onError(error);
    else console.error("Streaming chat error:", error);
  }
};

export default api;

