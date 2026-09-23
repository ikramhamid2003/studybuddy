const DEFAULT_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://studybuddy-api-hkgx.onrender.com/api"
    : "http://localhost:8000/api";

const BASE_URL = process.env.REACT_APP_API_URL || DEFAULT_API_URL;

// ── Core request → POST /unified/ ───────────────────────────────────────────

async function _request(action, body = {}) {
  // Centralizes auth headers and unified-response handling for every JSON API
  // call, so pages only deal with successful `data` payloads or thrown errors.
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(`${BASE_URL}/unified/`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, ...body }),
  });

  // Parse defensively: a platform error page or an HTML error response would
  // make resp.json() throw and mask the real status behind a parse error.
  let json = null;
  try {
    json = await resp.json();
  } catch {
    json = null;
  }

  if (!resp.ok || !json || !json.ok) {
    // Surface the server's own message when there is one, and always include
    // the action and HTTP status so failures are diagnosable from the UI.
    const msg = json?.error || `${action} failed (HTTP ${resp.status})`;
    throw new Error(msg);
  }
  return json.data;
}

// ── Generation tools ────────────────────────────────────────────────────────

export const generateAll = async (topic, type, options = {}) =>
  // Every AI tool persists through the backend's unified generate action.
  _request("generate", { topic, type, ...options });

export const listGenerations = async (type) =>
  // Undefined filters are ignored by the backend, giving the All page all tools.
  _request("generations_list", { query_type: type ?? undefined });

export const deleteGeneration = async (generationId) =>
  // Removes one saved history entry; the backend scopes it to the signed-in user.
  _request("generation_delete", { generation_id: generationId });

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
    // Streaming chat uses raw fetch instead of _request because the response is
    // an SSE byte stream, not a single JSON payload.
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

    // Read the stream manually so the UI can render tokens as they arrive.
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      // SSE events can arrive split across chunks, so keep the unfinished tail
      // in `buffer` until the next read completes it.
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

    // Flush any final SSE event that did not end with a double newline.
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
    // Surface streaming failures to the page when it supplied an error handler.
    if (onError) onError(error);
    else console.error("Streaming chat error:", error);
  }
};
