const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

// ── Core request → POST /unified/ ───────────────────────────────────────────

async function _request(action, body = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(`${BASE_URL}/unified/`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, ...body }),
  });

  const json = await resp.json();

  if (!resp.ok || !json.ok) {
    const msg = json.error || resp.statusText || "Request failed";
    throw new Error(msg);
  }
  return json.data;
}

// ── Generation tools ────────────────────────────────────────────────────────

export const generateAll = async (topic, type, options = {}) =>
  _request("generate", { topic, type, ...options });

export const listGenerations = async (type) =>
  _request("generations_list", { query_type: type ?? undefined });

// ── Chat sessions ───────────────────────────────────────────────────────────

export const listChatSessions = () => _request("sessions_list");

export const createChatSession = () => _request("session_create");

export const getChatSession = (sessionId) =>
  _request("sessions_detail", { session_id: sessionId });

export const renameChatSession = (sessionId, title) =>
  _request("session_rename", { session_id: sessionId, title });

export const deleteChatSession = (sessionId) =>
  _request("session_delete", { session_id: sessionId });

// ── Streaming chat (SSE, raw fetch) ─────────────────────────────────────────

export const sendChatStream = async (
  message,
  history,
  sessionId,
  onChunk,
  onDone,
  onError,
) => {
  try {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}/unified/`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "chat_stream",
        message,
        history,
        session_id: sessionId ?? null,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let resultSessionId = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop(); // keep partial line

      for (const line of lines) {
        const cleanLine = line.trim();
        if (cleanLine.startsWith("data: ")) {
          try {
            const data = JSON.parse(cleanLine.substring(6));
            if (data.error) throw new Error(data.error);
            if (data.chunk) onChunk(data.chunk);
            if (data.done) resultSessionId = data.session_id ?? null;
          } catch (e) {
            console.error("Error parsing SSE chunk:", e);
          }
        }
      }
    }

    // flush any remaining data
    if (buffer.trim()) {
      const cleanLine = buffer.trim();
      if (cleanLine.startsWith("data: ")) {
        try {
          const data = JSON.parse(cleanLine.substring(6));
          if (data.error) throw new Error(data.error);
          if (data.chunk) onChunk(data.chunk);
          if (data.done) resultSessionId = data.session_id ?? null;
        } catch (e) {
          console.error("Error parsing SSE chunk:", e);
        }
      }
    }

    onDone(resultSessionId);
  } catch (error) {
    if (onError) onError(error);
    else console.error("Streaming chat error:", error);
  }
};
