import { deleteGeneration, listGenerations } from "./api";

// The unified client is the single place every API call funnels through, so its
// error surfacing decides what users actually see when a request fails.
describe("unified request error handling", () => {
  const realFetch = global.fetch;

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
