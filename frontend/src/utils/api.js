const DEFAULT_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://studybuddy-api-hkgx.onrender.com/api"
    : "http://localhost:8000/api";

const BASE_URL = process.env.REACT_APP_API_URL || DEFAULT_API_URL;

// Broadcast when the access token has expired and could not be renewed, so
// AuthContext can drop the session instead of leaving the UI signed in with a
// token the server has already rejected.
export const SESSION_EXPIRED_EVENT = "studybuddy:session-expired";

// ── Token refresh ────────────────────────────────────────────────────────────

let refreshInFlight = null;

function clearTokens() {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh");
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

async function exchangeRefreshToken(refresh) {
  const resp = await fetch(`${BASE_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  const json = await resp.json().catch(() => null);
  if (!resp.ok || !json) return null;

  localStorage.setItem("token", json.access);
  // Refresh tokens rotate and the old one is blacklisted on use, so the new one
  // has to replace it or the next renewal fails.
  if (json.refresh) localStorage.setItem("refresh", json.refresh);
  return json.access;
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem("refresh");
  if (!refresh) return null;

  // Concurrent 401s share one exchange. Rotating tokens are single-use, so a
  // second call carrying the same token would be rejected as already used.
  if (!refreshInFlight) {
    refreshInFlight = exchangeRefreshToken(refresh)
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function authHeaders(json = true) {
  // Read at call time so a retry picks up the token a refresh just stored.
  const headers = {};
  if (json) headers["Content-Type"] = "application/json";
  const token = localStorage.getItem("token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/**
 * Run a request, renewing the access token and retrying once on a 401.
 * Returns null when the session could not be renewed.
 */
async function fetchWithRefresh(makeRequest) {
  const response = await makeRequest();
  if (response.status !== 401) return response;

  const token = await refreshAccessToken();
  if (!token) {
    clearTokens();
    return null;
  }
  return makeRequest();
}

const SESSION_EXPIRED_MESSAGE = "Session expired. Please sign in again.";

// ── Core request helper for explicit API routes ─────────────────────────────

async function _request(path, body = {}, method = "POST") {
  // Centralizes auth headers and JSON-response handling for explicit endpoints.
  const response = await fetchWithRefresh(
    () =>
      fetch(`${BASE_URL}${path}`, {
        method,
        headers: authHeaders(),
        ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
      }),
  );

  if (!response) throw new Error(SESSION_EXPIRED_MESSAGE);
  if (response.status === 204) return {};

  // Parse defensively: a platform error page or an HTML error response would
  // make resp.json() throw and mask the real status behind a parse error.
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok || !json || json.ok === false) {
    // Surface the server's own message when there is one, and always include
    // the action and HTTP status so failures are diagnosable from the UI.
    const msg = json?.error || json?.detail || `${path} failed (HTTP ${response.status})`;
    throw new Error(msg);
  }
  return json.ok === true ? json.data : json;
}

// ── Generation tools ────────────────────────────────────────────────────────

export const generateAll = async (topic, type, options = {}) =>
  // Every AI tool persists through POST /api/generate/ with its `type`.
  _request("/generate/", { topic, type, ...options });

export const listGenerations = async (type) =>
  // Undefined filters are ignored by the backend, giving the All page all tools.
  _request(`/generations/${type ? `?type=${encodeURIComponent(type)}` : ""}`, {}, "GET");

export const deleteGeneration = async (generationId) =>
  // Removes one saved history entry; the backend scopes it to the signed-in user.
  _request(`/generations/${generationId}/`, {}, "DELETE");

// ── Usage ───────────────────────────────────────────────────────────────────

export const fetchUsageStats = () =>
  // Cumulative provider-reported tokens and priced cost across every Generation.
  _request("/usage/", {}, "GET");

export const fetchCurrentUser = () =>
  // Identity for sessions whose access token predates the `username` claim.
  _request("/auth/me/", {}, "GET");

// ── Chat sessions ───────────────────────────────────────────────────────────

export const listChatSessions = () => _request("/sessions/", {}, "GET");

export const createChatSession = () => _request("/sessions/");

export const getChatSession = (sessionId) =>
  _request(`/sessions/${sessionId}/`, {}, "GET");

export const renameChatSession = (sessionId, title) =>
  _request(`/sessions/${sessionId}/`, { title }, "PATCH");

export const deleteChatSession = (sessionId) =>
  _request(`/sessions/${sessionId}/`, {}, "DELETE");

export const fetchChatSuggestions = (sessionId) =>
  // 2-3 short follow-up questions the model suggests for a session's latest turn.
  _request(`/sessions/${sessionId}/suggestions/`);

// ── Streaming chat (SSE, raw fetch) ─────────────────────────────────────────

export const sendChatStream = async (
  message,
  history,
  sessionId,
  onChunk,
  onDone,
  onError,
  documentIds,
) => {
  // Streaming chat uses raw fetch instead of _request because the response is
  // an SSE byte stream, not a single JSON payload.
  const response = await fetchWithRefresh(() =>
    fetch(`${BASE_URL}/chat/stream/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        message,
        history,
        session_id: sessionId ?? null,
        ...(documentIds?.length ? { document_ids: documentIds } : {}),
      }),
    }),
  );

  if (!response) {
    onError(new Error(SESSION_EXPIRED_MESSAGE));
    return;
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let resultSessionId = null;
  let resultSources = [];

  // One frame is either a token chunk, a completion marker carrying the session
  // id and the citations that grounded the reply, or a server-reported error.
  // Only a malformed frame is recoverable, so it is logged and skipped.
  // A server error is rethrown:
  const handleFrame = (frame) => {
    const cleanLine = frame.trim();
    if (!cleanLine.startsWith("data: ")) return;

    let data;
    try {
      data = JSON.parse(cleanLine.substring(6));
    } catch (e) {
      console.error("Malformed SSE frame:", e);
      return;
    }

    if (data.error) throw new Error(data.error);
    if (data.chunk) onChunk(data.chunk);
    if (data.done) {
      resultSessionId = data.session_id ?? null;
      resultSources = data.sources ?? [];
    }
  };

  // Read the stream manually so the UI can render tokens as they arrive.
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      // SSE events can arrive split across chunks, so keep the unfinished tail
      // in `buffer` until the next read completes it.
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop(); // keep partial line

      frames.forEach(handleFrame);
    }

    // Flush any final SSE event that did not end with a double newline.
    if (buffer.trim()) handleFrame(buffer);

    onDone(resultSessionId, resultSources);
  } catch (err) {
    onError(err);
  }
};

// ── RAG (Retrieval-Augmented Generation) ────────────────────────────────────

const RAG_ALLOWED_EXTENSIONS = [".pdf", ".txt", ".md"];
const RAG_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/octet-stream", // browsers sometimes omit a useful MIME for .md
]);

/**
 * Client-side file gate for RAG uploads (extension + optional MIME check).
 * @returns {string|null} error message, or null when the file is acceptable
 */
export function validateRagFile(file, maxMb = 20) {
  if (!file) return "No file selected";
  const name = (file.name || "").toLowerCase();
  const okExt = RAG_ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!okExt) return "Only PDF, TXT, or MD files are supported";
  if (file.type && !RAG_ALLOWED_MIME_TYPES.has(file.type)) {
    // Extension already passed; warn only when the browser reports a bad type.
    if (!name.endsWith(".md") && !name.endsWith(".txt") && !name.endsWith(".pdf")) {
      return `Unsupported file type: ${file.type}`;
    }
  }
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) return `File exceeds the ${maxMb} MB limit`;
  if (file.size === 0) return "The selected file is empty";
  return null;
}

/**
 * Upload a file (PDF / TXT / MD) for RAG indexing.
 * Uses XHR so upload progress can drive the UI progress bar.
 * @param {File} file
 * @param {string} title
 * @param {{ onProgress?: (pct: number) => void }} [options]
 */
export const uploadDocument = async (file, title = "", options = {}) => {
  const validationError = validateRagFile(file);
  if (validationError) throw new Error(validationError);

  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);

  const { onProgress } = options;

  const sendOnce = (token) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BASE_URL}/rag/upload/`);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (!onProgress || !event.lengthComputable) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      };

      xhr.onload = () => {
        let json = null;
        try {
          json = JSON.parse(xhr.responseText);
        } catch {
          json = null;
        }
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          json,
        });
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(formData);
    });

  let token = localStorage.getItem("token");
  let result = await sendOnce(token);

  // Mirror fetchWithRefresh: renew once on 401, then retry the multipart upload.
  if (result.status === 401) {
    token = await refreshAccessToken();
    if (!token) {
      clearTokens();
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }
    result = await sendOnce(token);
  }

  if (!result.ok || !result.json || !result.json.ok) {
    const msg = result.json?.error || `Upload failed (HTTP ${result.status})`;
    throw new Error(msg);
  }
  onProgress?.(100);
  return result.json.data;
};

/** List all documents uploaded by the authenticated user. */
export const listDocuments = () => _request("/rag/documents/", {}, "GET");

/** Poll the processing status of a single document. */
export const getDocumentStatus = (documentId) =>
  _request(`/rag/documents/${documentId}/`, {}, "GET");

/** Delete a document and all its indexed chunks. */
export const deleteDocument = (documentId) =>
  _request(`/rag/documents/${documentId}/`, {}, "DELETE");
