import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequire } from "module";

// Load songs + retrieval via one Node CJS require so retrieval's internal
// require("../models/songs") shares this instance; stub runCandidateQuery.
const require = createRequire(import.meta.url);
const songs = require("../models/songs");
const retrieval = require("./retrieval");

beforeEach(() => {
  songs.runCandidateQuery = vi.fn();
});

describe("retrieveCandidates", () => {
  it("returns first non-empty attempt", async () => {
    songs.runCandidateQuery.mockResolvedValueOnce([{ id: 1 }]);
    const rows = await retrieval.retrieveCandidates({ genre: "POP", energy: 4, tags: ["x"] });
    expect(rows).toEqual([{ id: 1 }]);
    expect(songs.runCandidateQuery).toHaveBeenCalledTimes(1);
  });
  it("relaxes energy then genre when empty", async () => {
    songs.runCandidateQuery
      .mockResolvedValueOnce([]) // full
      .mockResolvedValueOnce([]) // drop energy
      .mockResolvedValueOnce([{ id: 7 }]); // drop genre
    const rows = await retrieval.retrieveCandidates({ genre: "POP", energy: 4, tags: ["x"] });
    expect(rows).toEqual([{ id: 7 }]);
    expect(songs.runCandidateQuery).toHaveBeenCalledTimes(3);
  });
  it("returns [] when nothing matches", async () => {
    songs.runCandidateQuery.mockResolvedValue([]);
    expect(await retrieval.retrieveCandidates({ genre: null, energy: null, tags: ["z"] })).toEqual([]);
  });
});
