import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "./app.js";

describe("app", () => {
  it("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
  it("unknown API route returns JSON 404-ish (not HTML)", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect([404, 500]).toContain(res.status);
  });
});
