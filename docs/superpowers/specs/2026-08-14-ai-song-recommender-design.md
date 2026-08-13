# AI-Powered Song Recommender — Design Spec

**Date:** 2026-08-14
**Author:** Wan Hafizuddin
**Status:** Approved (design), pending implementation plan

## 1. Context & goals

Upgrade of an existing personal song-recommendation web app (originally
`WanHafizuddin/fav-songs`) into a portfolio piece that closes two gaps found
across ~15 Malaysian SE internship postings:

1. **No frontend-framework experience** → add a React (Vite) frontend.
2. **No hands-on LLM/GenAI project** → add an AI "describe a mood, get a
   playlist" feature built as a **RAG-style extract → retrieve → rank** pipeline
   that recommends *real songs from our own database*, never hallucinated ones.

This work is done in a **new folder and repo** (`ai-song-recommender`), copied
from the existing backend as a starting point. The original `fav-songs` repo is
left untouched. We **extend** the Node/Express/PostgreSQL backend rather than
rebuild it.

### Success criteria

- A user types free-text mood/context and gets back a curated 10–15 song
  playlist, each with a one-line AI-written reason.
- Every returned song exists in our DB (verifiable; no hallucinated tracks).
- React SPA replaces the old EJS interface.
- Deploys as a single service on Render + Supabase Postgres, on free tiers only.
- Clean repo: no committed `node_modules`, no unused deps, real scripts, a real
  README.

### Non-goals (YAGNI)

- Passwords / real authentication (see §4, lightweight identity instead).
- Normalized `song_tags` junction table (a `TEXT[]` column is enough at this
  scale; the normalized version is an interview talking point, not built).
- pgvector semantic search in phase 1 — it is a **designed-in stretch** (§7),
  not initial scope.

## 2. Architecture

Single service. React SPA talks to an Express JSON API; Express orchestrates two
Gemini calls around a SQL retrieval step.

```
React SPA (Vite)  ──POST /api/recommend { moodText, username }──►  Express
                                                                     │
                            1. LLM extract  → JSON { genre, energy, tags }
                            2. retrieveCandidates(criteria)   ◄── the SEAM
                                   phase 1: SQL tag/genre/energy filter
                                   phase 2 (stretch): pgvector cosine search
                            3. LLM rerank   → best 10–15 + one-line reason each
                                   (returned IDs validated ⊆ candidates)
                            4. INSERT into mood_queries
                            5. return playlist JSON
                                                                     │
React renders song cards + AI blurb  ◄───────────────────────────────┘
```

**Core design move:** retrieval lives behind a single function
`retrieveCandidates(criteria)`. Phase 1 implements it as SQL tag filtering; the
pgvector stretch rewrites only that function's internals (same signature, no
pipeline changes). This is the "I understand retrieval trade-offs" story, built
into the architecture.

**Anti-hallucination guarantee:** the LLM only (a) *labels* songs at build time
and (b) *ranks real DB rows* at query time. Rerank output IDs are filtered
against the candidate set — any invented ID is dropped. `moodText` is treated
strictly as data to extract from.

## 3. LLM provider

**Gemini free tier for both chat and embeddings.**

| Need | Gemini (chosen) | Groq (rejected) |
|---|---|---|
| Chat (extract + rerank) | Gemini Flash | Llama (faster) |
| Embeddings (pgvector stretch) | `text-embedding-004`, free | no embedding endpoint |
| Keys to manage | one | one now + a second provider later |

Rationale: since the pgvector seam is planned, Gemini provides free embeddings
from the same key, keeping the stretch free and single-provider. Groq is faster
for chat; if demo latency matters later, swapping the chat calls to Groq is a
small, contained change because all provider code lives in `services/llm.js`.

## 4. User model — lightweight identity

A real `users` table, but "login" = typing/picking a username (no password).
`mood_queries.user_id` is a real FK. This keeps relational-design on display and
gives per-user mood history without auth complexity. The React app stores the
chosen username in `localStorage` and sends it on each request; the backend
does find-or-create by username.

## 5. Database schema (Supabase Postgres)

Fresh schema created clean on Supabase (pgvector-ready). Existing `song_table`
rows are migrated into the new `songs` table (`song` column → `title`).

```sql
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE songs (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,                             -- was "song"
  artist      TEXT NOT NULL,
  genre       TEXT,
  energy      SMALLINT CHECK (energy BETWEEN 1 AND 5),   -- LLM-assigned (1..5)
  tags        TEXT[] NOT NULL DEFAULT '{}',              -- mood/vibe descriptors
  enriched_at TIMESTAMPTZ,                               -- NULL = not yet labeled
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  -- embedding vector(768)  ← added ONLY in the pgvector stretch (§7)
);
CREATE INDEX songs_tags_gin ON songs USING GIN (tags);   -- fast `tags && '{...}'`

CREATE TABLE mood_queries (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  extracted  JSONB,   -- the { genre, energy, tags } the LLM produced
  results    JSONB,   -- [{ songId, reason }, ...] the returned playlist
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX mood_queries_user_idx ON mood_queries (user_id, created_at DESC);
```

**Migrations:** retire the ad-hoc `test.js` for a real `db/schema.sql`
(idempotent `CREATE TABLE IF NOT EXISTS`) run via `npm run db:setup`, plus
`db/seed.sql` for the catalog.

## 6. Song enrichment (second LLM use-case)

`scripts/enrich-songs.js`, run via `npm run enrich`. Offline labeling — this is
a second, distinct GenAI use-case for the interview story.

1. `SELECT id, title, artist, genre FROM songs WHERE enriched_at IS NULL`
   (idempotent + resumable — only touches unlabeled rows).
2. For each song, Gemini receives title/artist/genre and must return strict JSON
   `{ energy: 1..5, tags: [3–6 lowercase descriptors] }`.
3. Validate (energy in range, tags is a string array). Invalid → log and skip,
   leaving `enriched_at` NULL so the next run retries it.
4. `UPDATE songs SET energy=$1, tags=$2, enriched_at=now() WHERE id=$3`.

Respects Gemini free-tier rate limits (sequential or small batches).

**Growing the catalog:** add rows (seed file or the retained add form), then run
`enrich`. Reaching a few hundred songs is what makes playlists feel full.

## 7. Retrieval — the seam

`services/retrieval.js` exposes `retrieveCandidates(criteria)`.

**Phase 1 (initial scope) — SQL tag filtering:**
`WHERE tags && $tags OR genre = $genre`, scored by **tag-overlap count + energy
proximity**, `ORDER BY score LIMIT ~30`. If empty, relax filters (drop energy,
then genre); if still empty, return a friendly empty state (not an error).

**Phase 2 (stretch) — pgvector cosine search:**
Add `embedding vector(768)`; backfill embeddings from the same enriched text via
Gemini `text-embedding-004`; retrieve by cosine similarity to the embedded
`moodText`. Same function signature — no pipeline rewrite. Supabase already
supports pgvector, so zero infra migration.

## 8. `POST /api/recommend` pipeline

New modules (small, single-purpose):
`services/llm.js` (only file that knows Gemini: `extractCriteria`,
`rerankSongs`), `services/retrieval.js` (the seam), `routes/recommend.js`
(orchestration), `models/user.js`, `models/moodQuery.js`; `models/songs.js`
gains query helpers.

Pipeline for `{ moodText, username }`:

1. **Validate & resolve user.** `moodText` non-empty, capped ~500 chars → else
   `400`. Find-or-create user by `username`.
2. **Extract** — `extractCriteria(moodText)` → strict JSON
   `{ genre?, energy?, tags[] }`. Parse + validate. Malformed → one retry, then
   fall back to using `moodText` keywords as tags rather than failing.
3. **Retrieve** — `retrieveCandidates(criteria)` (§7).
4. **Rerank** — `rerankSongs(candidates, moodText)` → best 10–15 + one-line
   reason each, `[{ id, reason }]`. **Guard:** returned IDs filtered to the
   candidate set. On failure, **degrade gracefully**: return top-N candidates by
   score without blurbs. Toggleable via `RERANK_ENABLED` env flag so the
   retrieve-only vs retrieve+rerank paths can be demoed side by side.
5. **Persist** — `INSERT INTO mood_queries (user_id, query_text, extracted, results)`.
6. **Respond** — `{ playlist: [{ id, title, artist, genre, reason }], criteria }`.

Latency: two serial LLM calls ≈ 1–3s → covered by the React skeleton state.

## 9. Frontend (React + Vite)

React SPA becomes the whole UI; EJS views retire.

- `UsernameGate` — username → `localStorage`, sent as `username` on requests.
- **Mood page** (headline): `MoodInput` (textarea + submit) → `PlaylistResults`
  (`SongCard`s: title, artist, genre, AI blurb) with a skeleton/loading state.
- **Songs page**: existing add / list / delete catalog, reimplemented in React.

**API refactor** — existing EJS routes become a JSON API:

| Now (EJS) | Becomes (JSON) |
|---|---|
| `GET /playlists` (render) | `GET /api/songs` |
| `POST /` (redirect) | `POST /api/songs` |
| `GET /playlists/delete/:id` | `DELETE /api/songs/:id` |
| — | `POST /api/recommend` (new) |

(The last row also fixes a REST smell: delete-via-GET becomes a real `DELETE`.)

**Dev vs prod (single service):**
- Dev: Vite dev server (5173) proxies `/api` → Express (3000); `npm run dev`
  runs both via `concurrently`.
- Prod: `vite build` → `client/dist`; Express serves it as static + an SPA
  fallback for non-`/api` routes. One Render service.

## 10. Testing (Vitest)

Light but real signal:
- LLM-output **validator** (good/malformed JSON, energy range, tags type).
- **Anti-hallucination guard** (invented IDs get dropped).
- **Retrieval query builder** (criteria → correct SQL + params).

## 11. Repo cleanup (part of the upgrade)

- This repo starts clean: `.gitignore` already excludes `node_modules/`,
  `.env*`, and `client/dist/` from commit 1, so nothing needs untracking here.
  (The original `fav-songs` repo *did* track `node_modules` — a mistake this new
  repo avoids from the start.)
- Drop unused deps: `body`, `g`, `scss`, `sequelize` (and `sass` once
  EJS/SCSS is gone). Add `@google/generative-ai`; dev deps `vite`, `react`,
  `react-dom`, `@vitejs/plugin-react`, `vitest`, `concurrently`.
- Real `scripts`: `start`, `dev`, `build`, `db:setup`, `enrich`, `test`.
- Add `.env.example` (`DATABASE_URL`, `GEMINI_API_KEY`, `RERANK_ENABLED`,
  `PORT`); rewrite the 16-byte `README.md`.

**Resulting layout:**
```
app.js                       Express: JSON API + serves client/dist
routes/    recommend.js  songs.js
services/  llm.js  retrieval.js
models/    user.js  songs.js  moodQuery.js
db/        schema.sql  seed.sql  setup.js
scripts/   enrich-songs.js
client/    src/App.jsx  src/components/*  vite.config.js
.env.example   README.md
```

## 12. Deployment

Supabase Postgres (free, pgvector-ready) + one Render web service running
Express, which also serves the built React `dist/`. Secrets in `.env`
(gitignored). Build step: `npm run build` (client deps + `vite build`); start:
`node app.js`.

## 13. Decisions log

| Decision | Choice | Why |
|---|---|---|
| Session outcome | Full design + committed spec + plan | Best portfolio outcome |
| User model | Lightweight identity (no passwords) | Relational flex, minimal scope |
| Song data | LLM-enrich existing + expand catalog | Adds a 2nd GenAI use-case |
| Retrieval | Phased: tags now, pgvector seam | Ship reliably; discuss both in interviews |
| LLM provider | Gemini (chat + embeddings) | Free embeddings, one key |
| Database host | Supabase | Free, pgvector-ready |
| `energy` scale | 1–5 | Simple, LLM-friendly |
| `song` column | Renamed to `title` | Clarity |
| Rerank step | Toggleable via `RERANK_ENABLED` | Demo both paths |
| Location | New `ai-song-recommender` folder + repo | Leave `fav-songs` untouched |

## 14. Stretch / future

- pgvector semantic search (§7 phase 2).
- Normalized `song_tags` table if the catalog grows large.
- Optional Groq swap for lower chat latency.
- Real authentication as a later milestone.
