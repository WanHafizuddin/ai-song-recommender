import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { recommend, getSongs, createSong, deleteSong, ApiError } from "./api.js";

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

beforeEach(() => {
  global.fetch = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("recommend", () => {
  it("POSTs moodText + username and returns the body", async () => {
    global.fetch.mockResolvedValue(jsonResponse({ playlist: [{ id: 1 }], criteria: { tags: ["x"] } }));
    const out = await recommend("chill", "wan");
    expect(out.playlist).toHaveLength(1);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe("/api/recommend");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ moodText: "chill", username: "wan" });
  });
  it("throws ApiError on non-2xx", async () => {
    global.fetch.mockResolvedValue(jsonResponse({ error: "bad" }, false, 400));
    await expect(recommend("x", "wan")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("songs api", () => {
  it("getSongs returns the songs array", async () => {
    global.fetch.mockResolvedValue(jsonResponse({ songs: [{ id: 1 }] }));
    expect(await getSongs()).toEqual([{ id: 1 }]);
  });
  it("createSong posts and returns the song", async () => {
    global.fetch.mockResolvedValue(jsonResponse({ song: { id: 3, title: "T" } }, true, 201));
    const song = await createSong({ title: "T", artist: "A", genre: "POP" });
    expect(song.id).toBe(3);
    expect(global.fetch.mock.calls[0][0]).toBe("/api/songs");
  });
  it("deleteSong sends DELETE and tolerates 204", async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error("no body"); } });
    await deleteSong(5);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe("/api/songs/5");
    expect(opts.method).toBe("DELETE");
  });
});
