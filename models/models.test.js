import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequire } from "module";

// Load db AND the models through one Node CommonJS require so they share a
// single db singleton. We then overwrite db.query with a spy; the models call
// db.query(...) dynamically, so they pick it up. (vi.mock can't intercept CJS
// require, and mixing ESM import with CJS require yields two separate db
// instances — see the injection note.)
const require = createRequire(import.meta.url);
const db = require("../util/database");
const user = require("./user");
const songs = require("./songs");
const moodQuery = require("./moodQuery");

beforeEach(() => {
  db.query = vi.fn();
});

describe("user.findOrCreateByUsername", () => {
  it("returns an existing user without inserting", async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 5, username: "wan" }] });
    const u = await user.findOrCreateByUsername(" wan ");
    expect(u).toEqual({ id: 5, username: "wan" });
    expect(db.query).toHaveBeenCalledTimes(1);
  });
  it("inserts when missing", async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 9, username: "new" }] });
    const u = await user.findOrCreateByUsername("new");
    expect(u.id).toBe(9);
    expect(db.query).toHaveBeenCalledTimes(2);
  });
  it("rejects blank username", async () => {
    await expect(user.findOrCreateByUsername("  ")).rejects.toThrow("INVALID_USERNAME");
  });
});

describe("songs", () => {
  it("deleteById returns affected row count", async () => {
    db.query.mockResolvedValueOnce({ rowCount: 1 });
    expect(await songs.deleteById(3)).toBe(1);
  });
  it("create passes title/artist/genre", async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, title: "T" }] });
    await songs.create({ title: "T", artist: "A", genre: "POP" });
    expect(db.query.mock.calls[0][1]).toEqual(["T", "A", "POP"]);
  });
});

describe("moodQuery.create", () => {
  it("serializes extracted/results to JSON strings", async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, created_at: "now" }] });
    await moodQuery.create({ userId: 1, queryText: "q", extracted: { a: 1 }, results: [{ songId: 2 }] });
    const params = db.query.mock.calls[0][1];
    expect(params[0]).toBe(1);
    expect(JSON.parse(params[2])).toEqual({ a: 1 });
    expect(JSON.parse(params[3])).toEqual([{ songId: 2 }]);
  });
});
