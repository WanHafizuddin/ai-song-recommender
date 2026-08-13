import { describe, it, expect } from "vitest";
import { buildCandidateQuery } from "./retrieval.js";

describe("buildCandidateQuery", () => {
  it("includes tags and genre filters with correct params", () => {
    const { text, params } = buildCandidateQuery({ genre: "POP", energy: 4, tags: ["upbeat"] });
    expect(params[0]).toEqual(["upbeat"]); // tags first
    expect(params).toContain("POP");
    expect(params).toContain(4);
    expect(params[params.length - 1]).toBe(30); // limit last
    expect(text).toMatch(/tags && \$1/);
    expect(text).toMatch(/LIMIT \$/);
  });
  it("omits filters that are absent (tags only)", () => {
    const { text, params } = buildCandidateQuery({ genre: null, energy: null, tags: ["rainy"] });
    expect(params[0]).toEqual(["rainy"]);
    expect(params[params.length - 1]).toBe(30);
    expect(text).not.toMatch(/genre =/);
  });
  it("honors a custom limit", () => {
    const { params } = buildCandidateQuery({ genre: "ROCK", energy: null, tags: [] }, 10);
    expect(params[params.length - 1]).toBe(10);
  });
});
