import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequire } from "module";

// Shared Node CJS require so the router's require("../models/songs") is the same
// object we stub here; the router calls songs.getAll()/create()/deleteById()
// dynamically and picks up the stubs.
const require = createRequire(import.meta.url);
const express = require("express");
const request = require("supertest");
const songs = require("../models/songs");
const songsRouter = require("./songs");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(songsRouter);
  return app;
}

beforeEach(() => {
  songs.getAll = vi.fn();
  songs.create = vi.fn();
  songs.deleteById = vi.fn();
});

describe("songs API", () => {
  it("GET /api/songs returns list", async () => {
    songs.getAll.mockResolvedValue([{ id: 1, title: "A" }]);
    const res = await request(makeApp()).get("/api/songs");
    expect(res.status).toBe(200);
    expect(res.body.songs).toHaveLength(1);
  });
  it("POST /api/songs 400 without title", async () => {
    const res = await request(makeApp()).post("/api/songs").send({ artist: "x" });
    expect(res.status).toBe(400);
  });
  it("POST /api/songs 201 creates", async () => {
    songs.create.mockResolvedValue({ id: 3, title: "T" });
    const res = await request(makeApp()).post("/api/songs").send({ title: "T", artist: "A", genre: "POP" });
    expect(res.status).toBe(201);
    expect(res.body.song.id).toBe(3);
  });
  it("DELETE /api/songs/:id 404 when absent", async () => {
    songs.deleteById.mockResolvedValue(0);
    const res = await request(makeApp()).delete("/api/songs/9");
    expect(res.status).toBe(404);
  });
  it("DELETE /api/songs/:id 204 when removed", async () => {
    songs.deleteById.mockResolvedValue(1);
    const res = await request(makeApp()).delete("/api/songs/3");
    expect(res.status).toBe(204);
  });
});
