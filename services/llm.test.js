import { describe, it, expect, vi, beforeEach } from "vitest";

function mockGeminiResponse(obj) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }],
    }),
  };
}

let llm;
beforeEach(async () => {
  vi.resetModules();
  process.env.GEMINI_API_KEY = "test-key";
  llm = await import("./llm.js");
});

describe("extractCriteria", () => {
  it("parses and validates the model's JSON", async () => {
    global.fetch = vi.fn().mockResolvedValue(mockGeminiResponse({ genre: "pop", energy: 3, tags: ["chill"] }));
    const out = await llm.extractCriteria("something chill");
    expect(out).toEqual({ genre: "POP", energy: 3, tags: ["chill"] });
  });
  it("throws on HTTP error", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(llm.extractCriteria("x")).rejects.toThrow(/GEMINI_HTTP_429/);
  });
});

describe("_parseJson", () => {
  it("strips code fences", () => {
    expect(llm._parseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
});

describe("enrichSong", () => {
  it("returns validated energy and tags", async () => {
    global.fetch = vi.fn().mockResolvedValue(mockGeminiResponse({ energy: 2, tags: ["Mellow", "rainy"] }));
    const out = await llm.enrichSong({ title: "T", artist: "A", genre: "RNB" });
    expect(out).toEqual({ energy: 2, tags: ["mellow", "rainy"] });
  });
});
