import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequire } from "module";

// Load express, supertest, the router, and its dependencies through one Node
// CJS require so the router's internal require(...) shares these instances.
// We stub methods on the shared module objects; the router calls them
// dynamically (e.g. llm.extractCriteria(...), retrieval.retrieveCandidates(...)),
// so it picks up the stubs. The real rerankGuard (pure) is used as-is.
const require = createRequire(import.meta.url);
const express = require("express");
const request = require("supertest");
const llm = require("../services/llm");
const retrieval = require("../services/retrieval");
const users = require("../models/user");
const moodQueries = require("../models/moodQuery");
const recommendRouter = require("./recommend");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(recommendRouter);
  return app;
}

beforeEach(() => {
  llm.extractCriteria = vi.fn();
  llm.rerankSongs = vi.fn();
  retrieval.retrieveCandidates = vi.fn();
  users.findOrCreateByUsername = vi.fn().mockResolvedValue({ id: 1, username: "wan" });
  moodQueries.create = vi.fn().mockResolvedValue({ id: 1, created_at: "now" });
  process.env.RERANK_ENABLED = "true";
});

describe("POST /api/recommend", () => {
  it("400 when moodText missing", async () => {
    const res = await request(makeApp()).post("/api/recommend").send({ username: "wan" });
    expect(res.status).toBe(400);
  });

  it("returns reranked playlist on happy path", async () => {
    llm.extractCriteria.mockResolvedValue({ genre: "POP", energy: 4, tags: ["upbeat"] });
    retrieval.retrieveCandidates.mockResolvedValue([
      { id: 1, title: "A", artist: "x", genre: "POP", tags: [] },
      { id: 2, title: "B", artist: "y", genre: "POP", tags: [] },
    ]);
    llm.rerankSongs.mockResolvedValue([{ id: 2, reason: "fits" }]);
    const res = await request(makeApp()).post("/api/recommend").send({ moodText: "upbeat study", username: "wan" });
    expect(res.status).toBe(200);
    expect(res.body.playlist).toEqual([{ id: 2, title: "B", artist: "y", genre: "POP", reason: "fits" }]);
    expect(moodQueries.create).toHaveBeenCalledOnce();
  });

  it("degrades to candidates when rerank throws", async () => {
    llm.extractCriteria.mockResolvedValue({ genre: null, energy: null, tags: ["chill"] });
    retrieval.retrieveCandidates.mockResolvedValue([{ id: 1, title: "A", artist: "x", genre: "POP", tags: [] }]);
    llm.rerankSongs.mockRejectedValue(new Error("boom"));
    const res = await request(makeApp()).post("/api/recommend").send({ moodText: "chill", username: "wan" });
    expect(res.status).toBe(200);
    expect(res.body.playlist[0]).toMatchObject({ id: 1, reason: null });
  });

  it("returns empty message when no candidates", async () => {
    llm.extractCriteria.mockResolvedValue({ genre: null, energy: null, tags: ["zzz"] });
    retrieval.retrieveCandidates.mockResolvedValue([]);
    const res = await request(makeApp()).post("/api/recommend").send({ moodText: "zzz", username: "wan" });
    expect(res.status).toBe(200);
    expect(res.body.playlist).toEqual([]);
    expect(res.body.message).toBeTruthy();
  });
});
