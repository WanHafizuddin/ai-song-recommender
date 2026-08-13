import { describe, it, expect } from "vitest";
import { applyRerank, fromCandidates } from "./rerankGuard.js";

const candidates = [
  { id: 1, title: "A", artist: "x", genre: "POP", tags: [] },
  { id: 2, title: "B", artist: "y", genre: "ROCK", tags: [] },
];

describe("applyRerank", () => {
  it("drops hallucinated ids and keeps rerank order", () => {
    const out = applyRerank([{ id: 2, reason: "fits" }, { id: 99, reason: "fake" }, { id: 1, reason: "ok" }], candidates);
    expect(out.map((s) => s.id)).toEqual([2, 1]);
    expect(out[0]).toMatchObject({ id: 2, title: "B", reason: "fits" });
  });
  it("dedupes repeated ids", () => {
    const out = applyRerank([{ id: 1, reason: "a" }, { id: 1, reason: "b" }], candidates);
    expect(out.map((s) => s.id)).toEqual([1]);
  });
  it("caps to maxResults", () => {
    const out = applyRerank([{ id: 1 }, { id: 2 }], candidates, 1);
    expect(out).toHaveLength(1);
  });
});

describe("fromCandidates", () => {
  it("returns candidates with null reason, capped", () => {
    const out = fromCandidates(candidates, 1);
    expect(out).toEqual([{ id: 1, title: "A", artist: "x", genre: "POP", reason: null }]);
  });
});
