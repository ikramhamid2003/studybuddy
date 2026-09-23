import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "util";
import { deleteGeneration, listGenerations, sendChatStream } from "./api";

// jsdom does not provide these, but the streaming client decodes the SSE byte
// stream with TextDecoder, so both sides of the test need them.
if (typeof global.TextEncoder === "undefined") global.TextEncoder = NodeTextEncoder;
if (typeof global.TextDecoder === "undefined") global.TextDecoder = NodeTextDecoder;

const realFetch = global.fetch;

// The unified client is the single place every API call funnels through, so its
// error surfacing decides what users actually see when a request fails.
describe("unified request error handling", () => {
  afterEach(() => {
    global.fetch = realFetch;
  });

  function mockResponse({ ok, status, json }) {
    global.fetch = jest.fn().mockResolvedValue({ ok, status, json });
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
      "generations_list failed (HTTP 400)"
    );
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

  test("sends the delete action with the generation id", async () => {
    mockResponse({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: {} }),
    });

    await deleteGeneration(42);

    const [, options] = global.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      action: "generation_delete",
      generation_id: 42,
    });
  });
});

// Streaming responses are not JSON, so they need their own harness.
describe("streaming chat frame handling", () => {
  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  function mockStream(frames) {
    const encoder = new TextEncoder();
    let i = 0;
    global.fetch = jest.fn().mockResolvedValue({
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

    const onError = jest.fn();
    const onDone = jest.fn();

    await sendChatStream("hi", [], 1, jest.fn(), onDone, onError);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe("model_not_found");
    expect(onDone).not.toHaveBeenCalled();
  });

  test("streams chunks and reports the session id on completion", async () => {
    mockStream([
      'data: {"chunk":"Hel"}\n\n',
      'data: {"chunk":"lo"}\n\n',
      'data: {"done":true,"session_id":42}\n\n',
    ]);

    const onChunk = jest.fn();
    const onDone = jest.fn();

    await sendChatStream("hi", [], null, onChunk, onDone, jest.fn());

    expect(onChunk.mock.calls.map((call) => call[0])).toEqual(["Hel", "lo"]);
    expect(onDone).toHaveBeenCalledWith(42);
  });

  test("skips a malformed frame and keeps reading the stream", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockStream(['data: {not json}\n\n', 'data: {"chunk":"ok"}\n\n']);

    const onChunk = jest.fn();
    const onError = jest.fn();

    await sendChatStream("hi", [], null, onChunk, jest.fn(), onError);

    expect(onChunk).toHaveBeenCalledWith("ok");
    expect(onError).not.toHaveBeenCalled();
  });
});
