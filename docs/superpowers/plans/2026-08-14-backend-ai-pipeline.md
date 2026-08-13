# Backend AI Recommendation Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend for the "describe a mood, get a playlist" feature — an LLM extract → SQL retrieve → LLM rerank pipeline over our own Postgres song catalog, exposed as a JSON API, with the old EJS CRUD refactored to JSON endpoints.

**Architecture:** Express (CommonJS) JSON API. `POST /api/recommend` calls Gemini to extract structured criteria from mood text, runs a parameterized SQL query to retrieve real candidate songs, optionally calls Gemini again to rank them and write blurbs, validates that ranked IDs exist in the DB (anti-hallucination), saves the query to `mood_queries`, and returns the playlist. All Gemini access is isolated to `services/llm.js` (REST via `fetch`); all decision logic lives in pure, unit-tested functions.

**Tech Stack:** Node.js (CommonJS), Express, `pg`, Gemini REST API via global `fetch`, Vitest + Supertest for tests. Postgres hosted on Supabase.

**Scope:** This is Plan 1 of a series. It delivers the complete backend + AI pipeline (testable via Vitest and `curl`). **Out of scope here** (separate plans): the React frontend, and the pgvector semantic-search stretch. This plan leaves a clean seam for both.

## Global Constraints

- Language: **CommonJS** (`require`/`module.exports`) — match the existing codebase. Do NOT set `"type": "module"`.
- Node **18+** required (uses global `fetch`).
- Free tier only. No secrets in git. All secrets read from `.env` (already gitignored): `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_CHAT_MODEL`, `RERANK_ENABLED`, `PORT`.
- Gemini chat model id comes from `GEMINI_CHAT_MODEL` (default `gemini-2.0-flash`); never hardcode a model id anywhere except that default.
- **Anti-hallucination rule (non-negotiable):** the API must never return a song whose `id` is not present in the DB candidate set. Reranker output IDs are always filtered against candidates.
- `energy` is an integer **1–5**. `genre` is one of `RNB, KPOP, INDIE, FUNK, ROCK, POP, HIP-HOP, OTHER` or null.
- Tests must not require a network connection or a live database: mock `fetch` and the model layer. Tasks that genuinely need the DB (schema, enrichment) are verified by a documented manual/integration check, clearly labeled.
- Every task ends with a commit.

---

### Task 1: Project tooling & dependencies

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Create: `smoke.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: working `npm test` (Vitest), `npm start`, and the dependency set every later task imports (`express`, `pg`, `vitest`, `supertest`).

- [ ] **Step 1: Replace `package.json`** with a clean version (drops unused `body`, `g`, `scss`, `sequelize`, `sass`; the old EJS/`body-parser` stack is removed because routes become JSON):

```json
{
  "name": "ai-song-recommender",
  "version": "1.0.0",
  "description": "AI mood-to-playlist recommender over a personal Postgres song catalog",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:setup": "node db/setup.js",
    "enrich": "node scripts/enrich-songs.js"
  },
  "dependencies": {
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "pg": "^8.14.0"
  },
  "devDependencies": {
    "supertest": "^7.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `.env.example`**:

```bash
# Supabase Postgres connection string
DATABASE_URL=postgres://user:password@host:5432/postgres
# Google AI Studio (Gemini) API key — free tier
GEMINI_API_KEY=your_key_here
# Chat model id (override to swap models)
GEMINI_CHAT_MODEL=gemini-2.0-flash
# Set to "false" to disable the LLM rerank pass (demo the retrieve-only path)
RERANK_ENABLED=true
# Server port
PORT=3000
```

- [ ] **Step 3: Write the smoke test** `smoke.test.js`:

```js
import { describe, it, expect } from "vitest";

describe("toolchain", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Install and run**

Run: `npm install && npm test`
Expected: Vitest runs, 1 passing test.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example smoke.test.js
git commit -m "chore: clean deps, add vitest/supertest toolchain and env template"
```

---

### Task 2: Database schema & setup script

**Files:**
- Create: `db/schema.sql`
- Create: `db/setup.js`
- Create: `db/seed.sql`
- Keep: `util/database.js` (already present; unchanged)
- Delete: `test.js`, `testDB.js` (old ad-hoc scripts superseded by `db/setup.js`)

**Interfaces:**
- Consumes: `util/database.js` (`db.query`, `db.pool`).
- Produces: `users`, `songs`, `mood_queries` tables in the target DB. Later tasks assume these columns exist.

> **Verification note:** DDL is verified by an integration check against your Supabase DB, not a unit test (unit tests must stay DB-free per Global Constraints).

- [ ] **Step 1: Create `db/schema.sql`**:

```sql
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS songs (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  artist      TEXT NOT NULL,
  genre       TEXT,
  energy      SMALLINT CHECK (energy BETWEEN 1 AND 5),
  tags        TEXT[] NOT NULL DEFAULT '{}',
  enriched_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS songs_tags_gin ON songs USING GIN (tags);

CREATE TABLE IF NOT EXISTS mood_queries (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  extracted  JSONB,
  results    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mood_queries_user_idx ON mood_queries (user_id, created_at DESC);
```

- [ ] **Step 2: Create `db/setup.js`**:

```js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const db = require("../util/database");

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await db.query(schema);
  console.log("✅ Schema applied");
  const seedPath = path.join(__dirname, "seed.sql");
  if (fs.existsSync(seedPath) && process.argv.includes("--seed")) {
    await db.query(fs.readFileSync(seedPath, "utf8"));
    console.log("✅ Seed applied");
  }
  await db.pool.end();
}

main().catch((err) => {
  console.error("❌ Setup failed:", err);
  process.exit(1);
});
```

- [ ] **Step 3: Create `db/seed.sql`** (starter catalog — expand later; `enrich` fills energy/tags):

```sql
INSERT INTO songs (title, artist, genre) VALUES
  ('Redbone', 'Childish Gambino', 'FUNK'),
  ('Sunflower', 'Post Malone', 'POP'),
  ('The Less I Know The Better', 'Tame Impala', 'INDIE'),
  ('HUMBLE.', 'Kendrick Lamar', 'HIP-HOP'),
  ('Kiss Of Life', 'Sade', 'RNB'),
  ('Spring Day', 'BTS', 'KPOP'),
  ('Everlong', 'Foo Fighters', 'ROCK'),
  ('Weightless', 'Marconi Union', 'OTHER')
ON CONFLICT DO NOTHING;
```

- [ ] **Step 4: Delete superseded scripts**

Run: `git rm test.js testDB.js`

- [ ] **Step 5: Integration verify** (needs `.env` with `DATABASE_URL`)

Run: `npm run db:setup -- --seed`
Then confirm in Supabase SQL editor (or psql):
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema='public';
-- expect: users, songs, mood_queries
SELECT count(*) FROM songs; -- expect: 8
```

- [ ] **Step 6: Commit**

```bash
git add db/schema.sql db/setup.js db/seed.sql
git commit -m "feat: postgres schema, idempotent setup script, starter seed"
```

---

### Task 3: Criteria validation (pure logic, TDD)

**Files:**
- Create: `services/criteria.js`
- Test: `services/criteria.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `validateCriteria(raw) -> { genre: string|null, energy: number|null, tags: string[] }`. Throws `Error('INVALID_CRITERIA')` when the object has no usable field or a malformed field. Used by `services/llm.js` (Task 6).

- [ ] **Step 1: Write the failing test** `services/criteria.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run services/criteria.test.js`
Expected: FAIL — cannot import `validateCriteria`.

- [ ] **Step 3: Implement** `services/criteria.js`:

```js
function validateCriteria(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("INVALID_CRITERIA");
  }

  const genre =
    typeof raw.genre === "string" && raw.genre.trim()
      ? raw.genre.trim().toUpperCase()
      : null;

  let energy = null;
  if (raw.energy !== undefined && raw.energy !== null) {
    const n = Number(raw.energy);
    if (Number.isInteger(n) && n >= 1 && n <= 5) energy = n;
    else throw new Error("INVALID_CRITERIA");
  }

  let tags = [];
  if (raw.tags !== undefined && raw.tags !== null) {
    if (!Array.isArray(raw.tags)) throw new Error("INVALID_CRITERIA");
    tags = raw.tags
      .filter((t) => typeof t === "string" && t.trim())
      .map((t) => t.trim().toLowerCase());
  }

  if (!genre && energy === null && tags.length === 0) {
    throw new Error("INVALID_CRITERIA");
  }
  return { genre, energy, tags };
}

module.exports = { validateCriteria };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run services/criteria.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add services/criteria.js services/criteria.test.js
git commit -m "feat: validateCriteria — normalize/validate extracted mood criteria"
```

---

### Task 4: Retrieval query builder (pure logic, TDD)

**Files:**
- Create: `services/retrieval.js` (this task adds `buildCandidateQuery`; Task 8 adds `retrieveCandidates`)
- Test: `services/retrieval.buildquery.test.js`

**Interfaces:**
- Consumes: nothing (pure).
- Produces: `buildCandidateQuery(criteria, limit = 30) -> { text: string, params: any[] }`. The parameter order is: tags (if any), genre (if any), energy (if any), limit (always last). Consumed by `retrieveCandidates` (Task 8).

- [ ] **Step 1: Write the failing test** `services/retrieval.buildquery.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run services/retrieval.buildquery.test.js`
Expected: FAIL — no `buildCandidateQuery` export.

- [ ] **Step 3: Implement** `services/retrieval.js`:

```js
function buildCandidateQuery(criteria, limit = 30) {
  const { genre, energy, tags } = criteria;
  const params = [];
  const where = [];

  let tagsIdx = null;
  if (Array.isArray(tags) && tags.length > 0) {
    params.push(tags);
    tagsIdx = params.length;
    where.push(`tags && $${tagsIdx}`);
  }

  if (genre) {
    params.push(genre);
    where.push(`genre = $${params.length}`);
  }

  // Relevance score: count of overlapping tags, plus closeness of energy.
  const overlap = tagsIdx
    ? `COALESCE(cardinality(ARRAY(SELECT unnest(tags) INTERSECT SELECT unnest($${tagsIdx}::text[]))), 0)`
    : `0`;

  let energyScore = `0`;
  if (energy !== null && energy !== undefined) {
    params.push(energy);
    energyScore = `(5 - ABS(COALESCE(energy, 3) - $${params.length}))`;
  }

  params.push(limit);
  const limitIdx = params.length;

  const whereClause = where.length ? `WHERE ${where.join(" OR ")}` : "";
  const text = `
    SELECT id, title, artist, genre, energy, tags,
           (${overlap} + ${energyScore}) AS score
    FROM songs
    ${whereClause}
    ORDER BY score DESC, id ASC
    LIMIT $${limitIdx}
  `.trim();

  return { text, params };
}

module.exports = { buildCandidateQuery };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run services/retrieval.buildquery.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add services/retrieval.js services/retrieval.buildquery.test.js
git commit -m "feat: buildCandidateQuery — parameterized tag/genre/energy scoring query"
```

---

### Task 5: Anti-hallucination rerank guard (pure logic, TDD)

**Files:**
- Create: `services/rerankGuard.js`
- Test: `services/rerankGuard.test.js`

**Interfaces:**
- Consumes: nothing (pure).
- Produces:
  - `applyRerank(rerankItems, candidates, maxResults = 15) -> Array<{id,title,artist,genre,reason}>` — keeps only items whose numeric `id` exists in `candidates`, preserves rerank order, dedupes, caps to `maxResults`.
  - `fromCandidates(candidates, maxResults = 15) -> Array<{id,title,artist,genre,reason:null}>` — fallback when rerank is off/failed.
- Both consumed by `routes/recommend.js` (Task 9).

- [ ] **Step 1: Write the failing test** `services/rerankGuard.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run services/rerankGuard.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `services/rerankGuard.js`:

```js
function toCard(song, reason) {
  return { id: song.id, title: song.title, artist: song.artist, genre: song.genre, reason };
}

function applyRerank(rerankItems, candidates, maxResults = 15) {
  const byId = new Map(candidates.map((s) => [s.id, s]));
  const seen = new Set();
  const playlist = [];
  for (const item of Array.isArray(rerankItems) ? rerankItems : []) {
    if (!item || typeof item !== "object") continue;
    const id = Number(item.id);
    if (!byId.has(id) || seen.has(id)) continue;
    seen.add(id);
    const reason = typeof item.reason === "string" ? item.reason.trim() : null;
    playlist.push(toCard(byId.get(id), reason));
    if (playlist.length >= maxResults) break;
  }
  return playlist;
}

function fromCandidates(candidates, maxResults = 15) {
  return candidates.slice(0, maxResults).map((s) => toCard(s, null));
}

module.exports = { applyRerank, fromCandidates };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run services/rerankGuard.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add services/rerankGuard.js services/rerankGuard.test.js
git commit -m "feat: rerank guard — drop hallucinated ids, cap, and fallback"
```

---

### Task 6: Gemini client (REST via fetch, mocked tests)

**Files:**
- Create: `services/llm.js`
- Test: `services/llm.test.js`

**Interfaces:**
- Consumes: `validateCriteria` (Task 3); global `fetch`; env `GEMINI_API_KEY`, `GEMINI_CHAT_MODEL`.
- Produces:
  - `extractCriteria(moodText) -> Promise<{genre,energy,tags}>` (validated).
  - `rerankSongs(candidates, moodText) -> Promise<Array<{id,reason}>>` (raw array; guard applied later in Task 9).
  - `enrichSong(song) -> Promise<{energy:number, tags:string[]}>` (used by Task 12).
  - Exposed helper `_parseJson(text)` for testing.

- [ ] **Step 1: Write the failing test** `services/llm.test.js` (mocks `fetch`):

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run services/llm.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `services/llm.js`:

```js
const { validateCriteria } = require("./criteria");

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-2.0-flash";

function apiKey() {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("GEMINI_API_KEY not set");
  return k;
}

function _parseJson(text) {
  const cleaned = String(text)
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

async function generate(prompt) {
  const res = await fetch(`${API_BASE}/${CHAT_MODEL}:generateContent?key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    }),
  });
  if (!res.ok) throw new Error(`GEMINI_HTTP_${res.status}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function safe(s) {
  return String(s).replace(/"/g, "'");
}

async function extractCriteria(moodText) {
  const prompt = `You extract music search filters from a mood description.
Return ONLY JSON: {"genre": string|null, "energy": integer 1-5|null, "tags": string[]}.
"genre" must be one of RNB, KPOP, INDIE, FUNK, ROCK, POP, HIP-HOP, OTHER, or null.
"energy": 1 = very calm, 5 = very energetic.
"tags": 2-6 lowercase mood/vibe words.
Mood: "${safe(moodText)}"`;
  return validateCriteria(_parseJson(await generate(prompt)));
}

async function rerankSongs(candidates, moodText) {
  const list = candidates
    .map((s) => `${s.id}: ${s.title} - ${s.artist} [${(s.tags || []).join(", ")}]`)
    .join("\n");
  const prompt = `From the candidate songs, choose the best 10-15 for the mood and give a one-line reason for each.
Return ONLY JSON: [{"id": number, "reason": string}]. Use ONLY ids that appear in the list.
Mood: "${safe(moodText)}"
Candidates:
${list}`;
  const parsed = _parseJson(await generate(prompt));
  if (!Array.isArray(parsed)) throw new Error("INVALID_RERANK");
  return parsed;
}

async function enrichSong(song) {
  const prompt = `Label this song for a mood-based recommender.
Return ONLY JSON: {"energy": integer 1-5, "tags": string[] of 3-6 lowercase mood/vibe words}.
Song: "${safe(song.title)}" by "${safe(song.artist)}" (genre: ${safe(song.genre || "unknown")})`;
  const raw = _parseJson(await generate(prompt));
  const energy = Number(raw.energy);
  if (!Number.isInteger(energy) || energy < 1 || energy > 5) throw new Error("INVALID_ENERGY");
  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim().toLowerCase())
    : [];
  if (tags.length === 0) throw new Error("NO_TAGS");
  return { energy, tags };
}

module.exports = { extractCriteria, rerankSongs, enrichSong, _parseJson };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run services/llm.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add services/llm.js services/llm.test.js
git commit -m "feat: Gemini REST client — extract, rerank, enrich (fetch-mocked tests)"
```

---

### Task 7: Data models (user, songs, moodQuery)

**Files:**
- Create: `models/user.js`
- Rewrite: `models/songs.js` (replace the old `Song` class with a functional module)
- Create: `models/moodQuery.js`
- Test: `models/models.test.js` (mocks `util/database`)

**Interfaces:**
- Consumes: `util/database` (`db.query`).
- Produces:
  - `user.findOrCreateByUsername(username) -> Promise<{id, username}>`
  - `songs.getAll()`, `songs.create({title,artist,genre})`, `songs.deleteById(id) -> Promise<number>`, `songs.runCandidateQuery({text,params}) -> Promise<rows>`, `songs.listUnenriched()`, `songs.setEnrichment(id, energy, tags)`
  - `moodQuery.create({userId, queryText, extracted, results}) -> Promise<{id, created_at}>`

> Tested by mocking `util/database` so no DB is needed. The exact SQL is asserted loosely (matched substrings + params), not by full string equality.

- [ ] **Step 1: Write the failing test** `models/models.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from "vitest";

const query = vi.fn();
vi.mock("../util/database.js", () => ({ default: { query }, query, pool: { end: vi.fn() } }));

let user, songs, moodQuery;
beforeEach(async () => {
  vi.resetModules();
  query.mockReset();
  user = await import("./user.js");
  songs = await import("./songs.js");
  moodQuery = await import("./moodQuery.js");
});

describe("user.findOrCreateByUsername", () => {
  it("returns an existing user without inserting", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 5, username: "wan" }] });
    const u = await user.findOrCreateByUsername(" wan ");
    expect(u).toEqual({ id: 5, username: "wan" });
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("inserts when missing", async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: 9, username: "new" }] });
    const u = await user.findOrCreateByUsername("new");
    expect(u.id).toBe(9);
    expect(query).toHaveBeenCalledTimes(2);
  });
  it("rejects blank username", async () => {
    await expect(user.findOrCreateByUsername("  ")).rejects.toThrow("INVALID_USERNAME");
  });
});

describe("songs", () => {
  it("deleteById returns affected row count", async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });
    expect(await songs.deleteById(3)).toBe(1);
  });
  it("create passes title/artist/genre", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, title: "T" }] });
    await songs.create({ title: "T", artist: "A", genre: "POP" });
    expect(query.mock.calls[0][1]).toEqual(["T", "A", "POP"]);
  });
});

describe("moodQuery.create", () => {
  it("serializes extracted/results to JSON strings", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, created_at: "now" }] });
    await moodQuery.create({ userId: 1, queryText: "q", extracted: { a: 1 }, results: [{ songId: 2 }] });
    const params = query.mock.calls[0][1];
    expect(params[0]).toBe(1);
    expect(JSON.parse(params[2])).toEqual({ a: 1 });
    expect(JSON.parse(params[3])).toEqual([{ songId: 2 }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run models/models.test.js`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `models/user.js`**:

```js
const db = require("../util/database");

async function findOrCreateByUsername(username) {
  const name = String(username || "").trim();
  if (!name) throw new Error("INVALID_USERNAME");
  const found = await db.query("SELECT id, username FROM users WHERE username = $1", [name]);
  if (found.rows[0]) return found.rows[0];
  const created = await db.query(
    `INSERT INTO users (username) VALUES ($1)
     ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
     RETURNING id, username`,
    [name]
  );
  return created.rows[0];
}

module.exports = { findOrCreateByUsername };
```

- [ ] **Step 4: Rewrite `models/songs.js`**:

```js
const db = require("../util/database");

async function getAll() {
  const r = await db.query(
    "SELECT id, title, artist, genre, energy, tags FROM songs ORDER BY id DESC"
  );
  return r.rows;
}

async function create({ title, artist, genre }) {
  const r = await db.query(
    `INSERT INTO songs (title, artist, genre) VALUES ($1, $2, $3)
     RETURNING id, title, artist, genre, energy, tags`,
    [title, artist, genre ?? null]
  );
  return r.rows[0];
}

async function deleteById(id) {
  const r = await db.query("DELETE FROM songs WHERE id = $1", [id]);
  return r.rowCount;
}

async function runCandidateQuery({ text, params }) {
  const r = await db.query(text, params);
  return r.rows;
}

async function listUnenriched() {
  const r = await db.query(
    "SELECT id, title, artist, genre FROM songs WHERE enriched_at IS NULL ORDER BY id"
  );
  return r.rows;
}

async function setEnrichment(id, energy, tags) {
  await db.query("UPDATE songs SET energy = $1, tags = $2, enriched_at = now() WHERE id = $3", [
    energy,
    tags,
    id,
  ]);
}

module.exports = { getAll, create, deleteById, runCandidateQuery, listUnenriched, setEnrichment };
```

- [ ] **Step 5: Implement `models/moodQuery.js`**:

```js
const db = require("../util/database");

async function create({ userId, queryText, extracted, results }) {
  const r = await db.query(
    `INSERT INTO mood_queries (user_id, query_text, extracted, results)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [
      userId,
      queryText,
      extracted ? JSON.stringify(extracted) : null,
      results ? JSON.stringify(results) : null,
    ]
  );
  return r.rows[0];
}

module.exports = { create };
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run models/models.test.js`
Expected: PASS (6 tests).

- [ ] **Step 7: Commit**

```bash
git add models/user.js models/songs.js models/moodQuery.js models/models.test.js
git commit -m "feat: functional models for users, songs, mood_queries"
```

---

### Task 8: retrieveCandidates with filter relaxation

**Files:**
- Modify: `services/retrieval.js` (add `retrieveCandidates`)
- Test: `services/retrieval.retrieve.test.js` (mocks `models/songs`)

**Interfaces:**
- Consumes: `buildCandidateQuery` (Task 4), `songs.runCandidateQuery` (Task 7).
- Produces: `retrieveCandidates(criteria) -> Promise<rows>`. Tries full criteria, then drops `energy`, then drops `genre`; returns the first non-empty result, else `[]`. Consumed by `routes/recommend.js` (Task 9).

- [ ] **Step 1: Write the failing test** `services/retrieval.retrieve.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from "vitest";

const runCandidateQuery = vi.fn();
vi.mock("../models/songs.js", () => ({ default: { runCandidateQuery }, runCandidateQuery }));

let retrieval;
beforeEach(async () => {
  vi.resetModules();
  runCandidateQuery.mockReset();
  retrieval = await import("./retrieval.js");
});

describe("retrieveCandidates", () => {
  it("returns first non-empty attempt", async () => {
    runCandidateQuery.mockResolvedValueOnce([{ id: 1 }]);
    const rows = await retrieval.retrieveCandidates({ genre: "POP", energy: 4, tags: ["x"] });
    expect(rows).toEqual([{ id: 1 }]);
    expect(runCandidateQuery).toHaveBeenCalledTimes(1);
  });
  it("relaxes energy then genre when empty", async () => {
    runCandidateQuery
      .mockResolvedValueOnce([]) // full
      .mockResolvedValueOnce([]) // drop energy
      .mockResolvedValueOnce([{ id: 7 }]); // drop genre
    const rows = await retrieval.retrieveCandidates({ genre: "POP", energy: 4, tags: ["x"] });
    expect(rows).toEqual([{ id: 7 }]);
    expect(runCandidateQuery).toHaveBeenCalledTimes(3);
  });
  it("returns [] when nothing matches", async () => {
    runCandidateQuery.mockResolvedValue([]);
    expect(await retrieval.retrieveCandidates({ genre: null, energy: null, tags: ["z"] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run services/retrieval.retrieve.test.js`
Expected: FAIL — no `retrieveCandidates` export.

- [ ] **Step 3: Extend `services/retrieval.js`** (add below `buildCandidateQuery`, and update exports):

```js
const songs = require("../models/songs");

async function retrieveCandidates(criteria) {
  const attempts = [criteria];
  if (criteria.energy !== null && criteria.energy !== undefined) {
    attempts.push({ ...criteria, energy: null });
  }
  if (criteria.genre) {
    attempts.push({ ...criteria, genre: null, energy: null });
  }
  for (const c of attempts) {
    const rows = await songs.runCandidateQuery(buildCandidateQuery(c));
    if (rows.length > 0) return rows;
  }
  return [];
}

module.exports = { buildCandidateQuery, retrieveCandidates };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run services/retrieval.retrieve.test.js services/retrieval.buildquery.test.js`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add services/retrieval.js services/retrieval.retrieve.test.js
git commit -m "feat: retrieveCandidates with energy/genre filter relaxation"
```

---

### Task 9: `POST /api/recommend` route (pipeline orchestration)

**Files:**
- Create: `routes/recommend.js`
- Test: `routes/recommend.test.js` (Supertest; mocks `services/llm`, `services/retrieval`, `models/user`, `models/moodQuery`)

**Interfaces:**
- Consumes: `llm.extractCriteria`, `llm.rerankSongs`; `retrieval.retrieveCandidates`; `rerankGuard.applyRerank`, `rerankGuard.fromCandidates`; `user.findOrCreateByUsername`; `moodQuery.create`; env `RERANK_ENABLED`.
- Produces: an Express router mounting `POST /api/recommend`. Consumed by `app.js` (Task 11).

- [ ] **Step 1: Write the failing test** `routes/recommend.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const extractCriteria = vi.fn();
const rerankSongs = vi.fn();
const retrieveCandidates = vi.fn();
const findOrCreateByUsername = vi.fn();
const create = vi.fn();

vi.mock("../services/llm.js", () => ({ default: { extractCriteria, rerankSongs }, extractCriteria, rerankSongs }));
vi.mock("../services/retrieval.js", () => ({ default: { retrieveCandidates }, retrieveCandidates }));
vi.mock("../models/user.js", () => ({ default: { findOrCreateByUsername }, findOrCreateByUsername }));
vi.mock("../models/moodQuery.js", () => ({ default: { create }, create }));

async function makeApp() {
  vi.resetModules();
  const router = (await import("./recommend.js")).default || (await import("./recommend.js"));
  const app = express();
  app.use(express.json());
  app.use(router);
  return app;
}

beforeEach(() => {
  [extractCriteria, rerankSongs, retrieveCandidates, findOrCreateByUsername, create].forEach((m) => m.mockReset());
  findOrCreateByUsername.mockResolvedValue({ id: 1, username: "wan" });
  create.mockResolvedValue({ id: 1, created_at: "now" });
  process.env.RERANK_ENABLED = "true";
});

describe("POST /api/recommend", () => {
  it("400 when moodText missing", async () => {
    const app = await makeApp();
    const res = await request(app).post("/api/recommend").send({ username: "wan" });
    expect(res.status).toBe(400);
  });

  it("returns reranked playlist on happy path", async () => {
    extractCriteria.mockResolvedValue({ genre: "POP", energy: 4, tags: ["upbeat"] });
    retrieveCandidates.mockResolvedValue([
      { id: 1, title: "A", artist: "x", genre: "POP", tags: [] },
      { id: 2, title: "B", artist: "y", genre: "POP", tags: [] },
    ]);
    rerankSongs.mockResolvedValue([{ id: 2, reason: "fits" }]);
    const app = await makeApp();
    const res = await request(app).post("/api/recommend").send({ moodText: "upbeat study", username: "wan" });
    expect(res.status).toBe(200);
    expect(res.body.playlist).toEqual([{ id: 2, title: "B", artist: "y", genre: "POP", reason: "fits" }]);
    expect(create).toHaveBeenCalledOnce();
  });

  it("degrades to candidates when rerank throws", async () => {
    extractCriteria.mockResolvedValue({ genre: null, energy: null, tags: ["chill"] });
    retrieveCandidates.mockResolvedValue([{ id: 1, title: "A", artist: "x", genre: "POP", tags: [] }]);
    rerankSongs.mockRejectedValue(new Error("boom"));
    const app = await makeApp();
    const res = await request(app).post("/api/recommend").send({ moodText: "chill", username: "wan" });
    expect(res.status).toBe(200);
    expect(res.body.playlist[0]).toMatchObject({ id: 1, reason: null });
  });

  it("returns empty message when no candidates", async () => {
    extractCriteria.mockResolvedValue({ genre: null, energy: null, tags: ["zzz"] });
    retrieveCandidates.mockResolvedValue([]);
    const app = await makeApp();
    const res = await request(app).post("/api/recommend").send({ moodText: "zzz", username: "wan" });
    expect(res.status).toBe(200);
    expect(res.body.playlist).toEqual([]);
    expect(res.body.message).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run routes/recommend.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `routes/recommend.js`:

```js
const express = require("express");
const router = express.Router();
const llm = require("../services/llm");
const { retrieveCandidates } = require("../services/retrieval");
const { applyRerank, fromCandidates } = require("../services/rerankGuard");
const users = require("../models/user");
const moodQueries = require("../models/moodQuery");

const MAX_MOOD_LEN = 500;
const rerankEnabled = () => process.env.RERANK_ENABLED !== "false";

function fallbackCriteria(moodText) {
  const tags = moodText
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3)
    .slice(0, 6);
  return { genre: null, energy: null, tags };
}

router.post("/api/recommend", async (req, res) => {
  try {
    const { moodText, username } = req.body || {};
    if (!moodText || typeof moodText !== "string" || !moodText.trim()) {
      return res.status(400).json({ error: "moodText is required" });
    }
    if (moodText.length > MAX_MOOD_LEN) {
      return res.status(400).json({ error: "moodText too long" });
    }
    if (!username || typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ error: "username is required" });
    }

    const user = await users.findOrCreateByUsername(username);

    let criteria;
    try {
      criteria = await llm.extractCriteria(moodText);
    } catch {
      criteria = fallbackCriteria(moodText);
    }

    const candidates = await retrieveCandidates(criteria);
    if (candidates.length === 0) {
      await moodQueries.create({ userId: user.id, queryText: moodText, extracted: criteria, results: [] });
      return res.json({ playlist: [], criteria, message: "No matching songs found. Try a different mood." });
    }

    let playlist;
    if (rerankEnabled()) {
      try {
        playlist = applyRerank(await llm.rerankSongs(candidates, moodText), candidates);
        if (playlist.length === 0) playlist = fromCandidates(candidates);
      } catch {
        playlist = fromCandidates(candidates);
      }
    } else {
      playlist = fromCandidates(candidates);
    }

    await moodQueries.create({
      userId: user.id,
      queryText: moodText,
      extracted: criteria,
      results: playlist.map((p) => ({ songId: p.id, reason: p.reason })),
    });

    return res.json({ playlist, criteria });
  } catch (err) {
    console.error("recommend error:", err);
    return res.status(500).json({ error: "internal error" });
  }
});

module.exports = router;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run routes/recommend.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add routes/recommend.js routes/recommend.test.js
git commit -m "feat: POST /api/recommend pipeline with rerank toggle and graceful degradation"
```

---

### Task 10: Songs JSON API (`/api/songs`)

**Files:**
- Create: `routes/songs.js`
- Delete: `routes/song.js`, `routes/playlists.js`, `routes/delete.js`, `views/index.ejs`, `views/playlists.ejs`, `public/style.css` (old EJS UI retired — replaced by JSON API + future React client)
- Test: `routes/songs.test.js` (Supertest; mocks `models/songs`)

**Interfaces:**
- Consumes: `songs.getAll`, `songs.create`, `songs.deleteById` (Task 7).
- Produces: router mounting `GET /api/songs`, `POST /api/songs`, `DELETE /api/songs/:id`. Consumed by `app.js` (Task 11).

- [ ] **Step 1: Write the failing test** `routes/songs.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const getAll = vi.fn();
const create = vi.fn();
const deleteById = vi.fn();
vi.mock("../models/songs.js", () => ({ default: { getAll, create, deleteById }, getAll, create, deleteById }));

async function makeApp() {
  vi.resetModules();
  const router = (await import("./songs.js")).default || (await import("./songs.js"));
  const app = express();
  app.use(express.json());
  app.use(router);
  return app;
}

beforeEach(() => [getAll, create, deleteById].forEach((m) => m.mockReset()));

describe("songs API", () => {
  it("GET /api/songs returns list", async () => {
    getAll.mockResolvedValue([{ id: 1, title: "A" }]);
    const res = await request(await makeApp()).get("/api/songs");
    expect(res.status).toBe(200);
    expect(res.body.songs).toHaveLength(1);
  });
  it("POST /api/songs 400 without title", async () => {
    const res = await request(await makeApp()).post("/api/songs").send({ artist: "x" });
    expect(res.status).toBe(400);
  });
  it("POST /api/songs 201 creates", async () => {
    create.mockResolvedValue({ id: 3, title: "T" });
    const res = await request(await makeApp()).post("/api/songs").send({ title: "T", artist: "A", genre: "POP" });
    expect(res.status).toBe(201);
    expect(res.body.song.id).toBe(3);
  });
  it("DELETE /api/songs/:id 404 when absent", async () => {
    deleteById.mockResolvedValue(0);
    const res = await request(await makeApp()).delete("/api/songs/9");
    expect(res.status).toBe(404);
  });
  it("DELETE /api/songs/:id 204 when removed", async () => {
    deleteById.mockResolvedValue(1);
    const res = await request(await makeApp()).delete("/api/songs/3");
    expect(res.status).toBe(204);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run routes/songs.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `routes/songs.js`:

```js
const express = require("express");
const router = express.Router();
const songs = require("../models/songs");

router.get("/api/songs", async (req, res) => {
  try {
    res.json({ songs: await songs.getAll() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

router.post("/api/songs", async (req, res) => {
  try {
    const { title, artist, genre } = req.body || {};
    if (!title || !artist) return res.status(400).json({ error: "title and artist are required" });
    const song = await songs.create({ title, artist, genre });
    res.status(201).json({ song });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

router.delete("/api/songs/:id", async (req, res) => {
  try {
    const removed = await songs.deleteById(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

module.exports = router;
```

- [ ] **Step 4: Delete old EJS UI + routes**

Run: `git rm routes/song.js routes/playlists.js routes/delete.js views/index.ejs views/playlists.ejs public/style.css`

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run routes/songs.test.js`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add routes/songs.js routes/songs.test.js
git commit -m "feat: JSON songs API (GET/POST/DELETE); retire EJS UI and old routes"
```

---

### Task 11: App wiring & static-client serving

**Files:**
- Rewrite: `app.js`
- Test: `app.test.js` (Supertest against the exported app)

**Interfaces:**
- Consumes: `routes/songs`, `routes/recommend`.
- Produces: an Express `app` exported for tests; listens only when run directly. Serves `client/dist` (built React, added in the frontend plan) with an SPA fallback for non-`/api` paths.

- [ ] **Step 1: Write the failing test** `app.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app.test.js`
Expected: FAIL — current `app.js` uses EJS/deleted routes and does not export `app`.

- [ ] **Step 3: Rewrite** `app.js`:

```js
require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use(require("./routes/songs"));
app.use(require("./routes/recommend"));

// Unknown API routes → JSON 404 (never fall through to the SPA).
app.use("/api", (req, res) => res.status(404).json({ error: "not found" }));

// Serve the built React client (created by the frontend plan) + SPA fallback.
const clientDist = path.join(__dirname, "client", "dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) res.status(404).send("Client not built yet. Run the frontend build.");
  });
});

if (require.main === module) {
  app.listen(port, () => console.log(`✅ Server running on port ${port}`));
}

module.exports = app;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all tests across all files PASS.

- [ ] **Step 6: Commit**

```bash
git add app.js app.test.js
git commit -m "feat: wire JSON API, health check, and SPA-fallback static serving"
```

---

### Task 12: Song enrichment script

**Files:**
- Create: `scripts/enrich-songs.js`

**Interfaces:**
- Consumes: `songs.listUnenriched`, `songs.setEnrichment` (Task 7); `llm.enrichSong` (Task 6); `util/database` (`db.pool.end`).
- Produces: a runnable `npm run enrich` that labels every `enriched_at IS NULL` song. Idempotent and resumable.

> **Verification note:** integration-verified against your DB + Gemini key (no unit test — it is glue over already-tested units).

- [ ] **Step 1: Implement** `scripts/enrich-songs.js`:

```js
require("dotenv").config();
const songs = require("../models/songs");
const llm = require("../services/llm");
const db = require("../util/database");

const DELAY_MS = 1200; // gentle on the free-tier rate limit

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const pending = await songs.listUnenriched();
  console.log(`Enriching ${pending.length} song(s)...`);
  let ok = 0;
  for (const s of pending) {
    try {
      const { energy, tags } = await llm.enrichSong(s);
      await songs.setEnrichment(s.id, energy, tags);
      ok++;
      console.log(`✓ [${s.id}] ${s.title} — energy ${energy}, tags ${tags.join(", ")}`);
    } catch (err) {
      console.warn(`✗ [${s.id}] ${s.title}: ${err.message} (left unenriched for retry)`);
    }
    await sleep(DELAY_MS);
  }
  console.log(`Done. Enriched ${ok}/${pending.length}.`);
  await db.pool.end();
}

main().catch((err) => {
  console.error("Enrichment failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Integration verify** (needs `.env` with `DATABASE_URL` + `GEMINI_API_KEY`, and Task 2 seed applied)

Run: `npm run enrich`
Expected: each seeded song prints `✓` with an energy (1–5) and tags. Then confirm:
```sql
SELECT title, energy, tags FROM songs WHERE enriched_at IS NOT NULL;
```
Re-run `npm run enrich` → prints `Enriching 0 song(s)` (idempotent).

- [ ] **Step 3: Commit**

```bash
git add scripts/enrich-songs.js
git commit -m "feat: idempotent LLM enrichment script for song energy/tags"
```

---

### Task 13: README rewrite

**Files:**
- Rewrite: `README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: documentation. No test.

- [ ] **Step 1: Rewrite** `README.md` with: project summary, the RAG-style pipeline diagram, the anti-hallucination design point, setup steps (`.env` from `.env.example`, `npm install`, `npm run db:setup -- --seed`, `npm run enrich`, `npm start`), the API surface (`POST /api/recommend`, `/api/songs`), how to run tests (`npm test`), the `RERANK_ENABLED` toggle, and a "Roadmap" noting the React frontend and pgvector stretch as follow-ups.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README with architecture, setup, and API reference"
```

---

## Self-Review

**1. Spec coverage:**
- Users table + lightweight identity → Tasks 2, 7 (`findOrCreateByUsername`). ✅
- `songs` schema with tags/energy/enriched_at → Task 2. ✅
- `mood_queries` with extracted/results JSONB → Tasks 2, 7. ✅
- LLM extract → Task 6 (`extractCriteria`) + Task 3 validation. ✅
- SQL retrieval seam behind one function → Tasks 4, 8 (`buildCandidateQuery`, `retrieveCandidates`). ✅
- LLM rerank + anti-hallucination guard → Tasks 5, 6, 9. ✅
- Rerank toggle (`RERANK_ENABLED`) → Task 9. ✅
- Save to mood_queries → Tasks 7, 9. ✅
- Enrichment script (2nd LLM use-case) → Tasks 6 (`enrichSong`), 12. ✅
- JSON API refactor (GET/POST/DELETE songs, DELETE fixes REST smell) → Task 10. ✅
- Single-service static serving + SPA fallback → Task 11. ✅
- Vitest tests: validator, guard, query builder → Tasks 3, 4, 5 (+ route tests 9, 10, 11). ✅
- Repo cleanup (deps, scripts, .env.example, README) → Tasks 1, 13. ✅
- Provider isolated to one file (Gemini via fetch) → Task 6. ✅
- **Out of scope (follow-up plans):** React frontend; pgvector `embedding` column + semantic search. Left with seams (Task 11 serves `client/dist`; `retrieveCandidates` is the swap point). ✅

**2. Placeholder scan:** No TBD/TODO; every code step contains real code. README task (13) describes concrete required sections rather than pasting full prose — acceptable for a docs task. ✅

**3. Type consistency:** `validateCriteria` returns `{genre,energy,tags}` — consumed consistently by `extractCriteria` (Task 6), `buildCandidateQuery` (Task 4), `retrieveCandidates` (Task 8), recommend route (Task 9). Playlist card shape `{id,title,artist,genre,reason}` consistent across `rerankGuard` (Task 5) and recommend route (Task 9). Model method names (`runCandidateQuery`, `listUnenriched`, `setEnrichment`, `findOrCreateByUsername`) match between Task 7 definitions and Tasks 8, 9, 12 consumers. ✅

## Notes on test module mocking

Tests use Vitest's `vi.mock` with both `default` and named exports so they work whether a consumer does `require("x")` (gets `module.exports`) — Vitest maps CommonJS `module.exports` onto the ESM `default`. If a mock ever fails to intercept, confirm the consumer's `require` path matches the `vi.mock` path exactly (relative to the test file).
