import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "util";
import {
  deleteGeneration,
  generateAll,
  listGenerations,
  sendChatStream,
  uploadDocument,
  validateRagFile,
} from "./api";

// jsdom does not provide these, but the streaming client decodes the SSE byte
// stream with TextDecoder, so both sides of the test need them.
if (typeof global.TextEncoder === "undefined") global.TextEncoder = NodeTextEncoder;
if (typeof global.TextDecoder === "undefined") global.TextDecoder = NodeTextDecoder;

const realFetch = global.fetch;

// The explicit-endpoint client is the single place every API call funnels
// through, so its error surfacing decides what users actually see on failure.
describe("explicit endpoint request handling", () => {
  afterEach(() => {
    global.fetch = realFetch;
  });

  function mockResponse({ ok, status, json }) {
    global.fetch = vi.fn().mockResolvedValue({ ok, status, json });
  }

  test("surfaces the server message from a JSON error envelope", async () => {
    mockResponse({
      ok: false,
      status: 400,
      json: async () => ({ ok: false, error: "Unknown action: generation_delete" }),
    });

    await expect(deleteGeneration(1)).rejects.toThrow(
      "Unknown action: generation_delete"
    );
  });

  test("falls back to action and status when the body is not JSON", async () => {
    // A platform error page or HTML error response must not hide the status
    // behind a JSON parse failure.
    mockResponse({
      ok: false,
      status: 400,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON at position 0");
      },
    });

    await expect(listGenerations("explain")).rejects.toThrow(
      "/generations/?type=explain failed (HTTP 400)"
    );
  });

  test.each([
    ["field arrays", { topic: ["This field may not be blank."] }, "This field may not be blank."],
    ["field strings", { type: "Invalid generation type." }, "Invalid generation type."],
    [
      "nested document indices",
      { document_ids: { 0: ["A valid integer is required."] } },
      "A valid integer is required.",
    ],
    [
      "nested fields",
      { options: { documents: [{ id: ["Unknown document."] }] } },
      "Unknown document.",
    ],
    ["non_field_errors", { non_field_errors: ["Select a topic or document."] }, "Select a topic or document."],
    [
      "the first useful reason",
      { topic: [], document_ids: [null, 42, {}, "", "  ", "Document unavailable.", "Later reason."] },
      "Document unavailable.",
    ],
  ])("generateAll surfaces %s", async (_label, body, message) => {
    mockResponse({ ok: false, status: 400, json: async () => body });

    await expect(generateAll("gravity", "explain")).rejects.toThrow(new Error(message));
  });

  test.each([
    [
      "error before detail and fields",
      { topic: ["Field reason."], detail: "Detail reason.", error: "Error reason." },
      "Error reason.",
    ],
    ["detail before fields", { topic: ["Field reason."], detail: "Detail reason." }, "Detail reason."],
    ["empty error", { error: "", detail: "Detail reason." }, "Detail reason."],
    ["blank error", { error: "  ", detail: "Detail reason." }, "Detail reason."],
    [
      "non-string error",
      { error: { topic: ["Nested reason."] }, detail: "Detail reason." },
      "Detail reason.",
    ],
    [
      "empty detail",
      { error: "", detail: "", topic: ["Field reason."] },
      "Field reason.",
    ],
    [
      "blank detail",
      { error: false, detail: "  ", topic: ["Field reason."] },
      "Field reason.",
    ],
    [
      "non-string detail",
      { error: {}, detail: 400, topic: ["Field reason."] },
      "Field reason.",
    ],
  ])("generateAll respects message precedence: %s", async (_label, body, message) => {
    mockResponse({ ok: false, status: 400, json: async () => body });

    await expect(generateAll("gravity", "explain")).rejects.toThrow(new Error(message));
  });

  test.each([
    null,
    {},
    [],
    "",
    "Unstructured response",
    400,
    false,
    { error: "", detail: "  ", topic: [] },
    { error: {}, detail: { status: 400 }, document_ids: { 0: [null, false, 42, {}] } },
    { ok: false, count: 0 },
  ])("generateAll falls back for a body without messages: %p", async (body) => {
    mockResponse({ ok: false, status: 400, json: async () => body });

    await expect(generateAll("gravity", "explain")).rejects.toThrow(
      new Error("/generate/ failed (HTTP 400)")
    );
  });

  test("generateAll keeps the path and status for non-JSON failures", async () => {
    mockResponse({
      ok: false,
      status: 502,
      json: async () => { throw new SyntaxError("Unexpected token <"); },
    });

    await expect(generateAll("gravity", "explain")).rejects.toThrow(
      new Error("/generate/ failed (HTTP 502)")
    );
  });

  test.each([
    [{ id: 7, topic: "gravity" }, { id: 7, topic: "gravity" }],
    [{ ok: true, data: { id: 7, topic: "gravity" } }, { id: 7, topic: "gravity" }],
  ])("generateAll preserves successful responses: %p", async (body, expected) => {
    mockResponse({ ok: true, status: 200, json: async () => body });

    await expect(generateAll("gravity", "explain")).resolves.toEqual(expected);
  });

  test("rejects when the envelope reports failure on an HTTP 200", async () => {
    mockResponse({
      ok: true,
      status: 200,
      json: async () => ({ ok: false, error: "generation_id required" }),
    });

    await expect(deleteGeneration(1)).rejects.toThrow("generation_id required");
  });

  test("returns the data payload on success", async () => {
    mockResponse({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: [{ id: 7, topic: "gravity" }] }),
    });

    await expect(listGenerations()).resolves.toEqual([{ id: 7, topic: "gravity" }]);
  });

  test("deletes a generation through its resource endpoint", async () => {
    mockResponse({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: {} }),
    });

    await deleteGeneration(42);

    const [, options] = global.fetch.mock.calls[0];
    expect(global.fetch.mock.calls[0][0]).toContain("/generations/42/");
    expect(options.method).toBe("DELETE");
  });
});

// Streaming responses are not JSON, so they need their own harness.
describe("streaming chat frame handling", () => {
  afterEach(() => {
    global.fetch = realFetch;
    vi.restoreAllMocks();
  });

  function mockStream(frames) {
    const encoder = new TextEncoder();
    let i = 0;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: async () =>
            i < frames.length
              ? { value: encoder.encode(frames[i++]), done: false }
              : { value: undefined, done: true },
        }),
      },
    });
  }

  test("surfaces an error frame sent mid-stream instead of swallowing it", async () => {
    // The regression this guards: the thrown server error was caught by the
    // same guard that handles malformed JSON, so onError never fired and the
    // user saw a dead chat with only a console line.
    mockStream(['data: {"error":"model_not_found"}\n\n']);

    const onError = vi.fn();
    const onDone = vi.fn();

    await sendChatStream("hi", [], 1, vi.fn(), onDone, onError);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe("model_not_found");
    expect(onDone).not.toHaveBeenCalled();
  });

  test("streams chunks and reports the session id on completion", async () => {
    mockStream([
      'data: {"chunk":"Hel"}\n\n',
      'data: {"chunk":"lo"}\n\n',
      'data: {"done":true,"session_id":42,"sources":[]}\n\n',
    ]);

    const onChunk = vi.fn();
    const onDone = vi.fn();

    await sendChatStream("hi", [], null, onChunk, onDone, vi.fn());

    expect(onChunk.mock.calls.map((call) => call[0])).toEqual(["Hel", "lo"]);
    expect(onDone).toHaveBeenCalledWith(42, []);
  });

  test("passes selected documents and returns their citations", async () => {
    mockStream([
      'data: {"chunk":"grounded"}\n\n',
      'data: {"done":true,"session_id":42,"sources":[{"document_title":"Notes"}]}\n\n',
    ]);

    const onDone = vi.fn();
    await sendChatStream("hi", [], null, vi.fn(), onDone, vi.fn(), [7, 8]);

    const [, options] = global.fetch.mock.calls[0];
    expect(JSON.parse(options.body).document_ids).toEqual([7, 8]);
    expect(onDone.mock.calls[0][1]).toEqual([{ document_title: "Notes" }]);
  });

  test("omits document_ids when nothing is selected", async () => {
    mockStream(['data: {"done":true,"session_id":42,"sources":[]}\n\n']);

    await sendChatStream("hi", [], null, vi.fn(), vi.fn(), vi.fn());

    const [, options] = global.fetch.mock.calls[0];
    expect(JSON.parse(options.body).document_ids).toBeUndefined();
  });

  test("skips a malformed frame and keeps reading the stream", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockStream(['data: {not json}\n\n', 'data: {"chunk":"ok"}\n\n']);

    const onChunk = vi.fn();
    const onError = vi.fn();

    await sendChatStream("hi", [], null, onChunk, vi.fn(), onError);

    expect(onChunk).toHaveBeenCalledWith("ok");
    expect(onError).not.toHaveBeenCalled();
  });
});

// Navigating away must cancel the in-flight request, otherwise the provider
// still bills for a generation the user stopped waiting for.
describe("request cancellation", () => {
  afterEach(() => {
    global.fetch = realFetch;
  });

  // What fetch rejects with when the caller aborts, as browsers actually do it.
  function abortError() {
    const err = new Error("The user aborted a request.");
    err.name = "AbortError";
    return err;
  }

  test("forwards the caller's signal to fetch without polluting the body", async () => {
    const controller = new AbortController();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: {} }),
    });

    await generateAll("gravity", "explain", { level: "beginner" }, controller.signal);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain("/generate/");
    expect(options.signal).toBe(controller.signal);
    // The signal travels as its own argument, so it never reaches the provider.
    expect(JSON.parse(options.body)).toEqual({
      topic: "gravity",
      type: "explain",
      level: "beginner",
    });
  });

  test("omits signal when the caller has none", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: {} }),
    });

    await generateAll("gravity", "explain");

    expect(global.fetch.mock.calls[0][1].signal).toBeUndefined();
  });

  test("propagates the abort from a JSON request so pages can suppress their toast", async () => {
    // Pages key their error toast on name === "AbortError"; swallowing it here
    // would leave a killed request indistinguishable from a server failure.
    const controller = new AbortController();
    global.fetch = vi.fn().mockRejectedValue(abortError());

    await expect(
      generateAll("gravity", "explain", {}, controller.signal)
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  test("treats an aborted stream as a stop, not an error", async () => {
    const controller = new AbortController();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: { getReader: () => ({ read: () => Promise.reject(abortError()) }) },
    });

    const onError = vi.fn();
    const onDone = vi.fn();

    await sendChatStream(
      "hi",
      [],
      1,
      vi.fn(),
      onDone,
      onError,
      undefined,
      controller.signal
    );

    expect(global.fetch.mock.calls[0][1].signal).toBe(controller.signal);
    expect(onError).not.toHaveBeenCalled();
    // A half-finished reply must not be reported as complete.
    expect(onDone).not.toHaveBeenCalled();
  });

  test("keeps reporting a real stream failure after a partial abort-free read", async () => {
    const encoder = new TextEncoder();
    let i = 0;
    const frames = ['data: {"chunk":"Hel"}\n\n'];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: async () => {
            if (i < frames.length) return { value: encoder.encode(frames[i++]), done: false };
            throw new Error("connection reset");
          },
        }),
      },
    });

    const onChunk = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    await sendChatStream("hi", [], 1, onChunk, onDone, onError);

    expect(onChunk).toHaveBeenCalledWith("Hel");
    expect(onError.mock.calls[0][0].message).toBe("connection reset");
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe("validateRagFile", () => {
  test("accepts pdf/txt/md under the size limit", () => {
    const file = new File(["hello notes"], "notes.txt", { type: "text/plain" });
    expect(validateRagFile(file)).toBeNull();
  });

  test("rejects unsupported extensions", () => {
    const file = new File(["x"], "photo.png", { type: "image/png" });
    expect(validateRagFile(file)).toMatch(/pdf, txt, or md/i);
  });

  test("rejects empty files", () => {
    const file = new File([], "empty.txt", { type: "text/plain" });
    expect(validateRagFile(file)).toMatch(/empty/i);
  });
});

describe("uploadDocument client validation", () => {
  test("fails before network when the file type is invalid", async () => {
    const file = new File(["x"], "virus.exe", { type: "application/octet-stream" });
    await expect(uploadDocument(file)).rejects.toThrow(/pdf, txt, or md/i);
  });
});
