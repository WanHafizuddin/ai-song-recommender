import { describe, it, expect } from "vitest";
import { validateCriteria } from "./criteria.js";

describe("validateCriteria", () => {
  it("normalizes a full object", () => {
    const out = validateCriteria({ genre: "pop", energy: 4, tags: [" Upbeat ", "Study"] });
    expect(out).toEqual({ genre: "POP", energy: 4, tags: ["upbeat", "study"] });
  });
  it("allows tags-only", () => {
    expect(validateCriteria({ tags: ["rainy"] })).toEqual({ genre: null, energy: null, tags: ["rainy"] });
  });
  it("throws on empty/unusable input", () => {
    expect(() => validateCriteria({ genre: "", tags: [] })).toThrow("INVALID_CRITERIA");
    expect(() => validateCriteria(null)).toThrow("INVALID_CRITERIA");
  });
  it("throws on energy out of range", () => {
    expect(() => validateCriteria({ energy: 9 })).toThrow("INVALID_CRITERIA");
  });
  it("throws when tags is not an array", () => {
    expect(() => validateCriteria({ tags: "pop" })).toThrow("INVALID_CRITERIA");
  });
});
