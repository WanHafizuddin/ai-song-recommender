# AI Song Recommender

Describe a mood in plain language and get back a curated 10–15 song playlist —
each track pulled from **our own Postgres catalog** and given a one-line,
AI-written reason. Built as a RAG-style **extract → retrieve → rank** pipeline
over Node/Express + PostgreSQL, with Google Gemini as the LLM.

This is the **backend + AI pipeline** (Plan 1 of a series). The React frontend
and a pgvector semantic-search upgrade are planned follow-ups — the code already
leaves clean seams for both.

## How it works

```
POST /api/recommend { moodText, username }
        │
        ▼
1. extractCriteria(moodText)   ── Gemini → { genre, energy, tags }   (validated)
        │
        ▼
2. retrieveCandidates(criteria) ── the SEAM
        SQL over songs: WHERE tags && $tags OR genre = $genre,
        scored by tag-overlap + energy proximity, LIMIT ~30.
        Relaxes filters (drop energy, then genre) if empty.
        │
        ▼
3. rerankSongs(candidates, moodText) ── Gemini → best 10–15 + a reason each
        │
        ▼   ┌─ anti-hallucination guard ─────────────────────────────┐
        │   │ reranked ids are filtered against the candidate set;   │
        │   │ any invented id is dropped. If rerank fails/off, we     │
        │   │ degrade to top candidates by score (no blurbs).         │
        │   └────────────────────────────────────────────────────────┘
        ▼
4. INSERT into mood_queries (history)
        ▼
5. { playlist: [{ id, title, artist, genre, reason }], criteria }
```

**Anti-hallucination guarantee (non-negotiable):** the API never returns a song
whose `id` is not in the DB candidate set. The LLM only *labels* songs at build
time and *ranks real rows* at query time — it never invents tracks. `moodText`
is treated strictly as data to extract from.

All Gemini access is isolated to [`services/llm.js`](services/llm.js); every
decision function (`validateCriteria`, `buildCandidateQuery`, the rerank guard)
is pure and unit-tested.

## Tech stack

- **Node.js 18+** (CommonJS) + **Express** — JSON API, also serves the built
  React client with an SPA fallback.
- **PostgreSQL** (Supabase, pgvector-ready) via `pg`.
- **Google Gemini** REST API (via global `fetch`) for extract, rerank, enrich.
- **Vitest** + **Supertest** for tests.

## Setup

Requires Node 18+ and a Postgres database (Supabase free tier works) plus a
Google AI Studio (Gemini) API key.

```bash
# 1. Configure secrets (never committed — .env is gitignored)
cp .env.example .env
# then edit .env: DATABASE_URL, GEMINI_API_KEY

# 2. Install dependencies
npm install

# 3. Create tables and load the starter catalog
npm run db:setup -- --seed

# 4. Label the catalog with energy + mood tags (uses Gemini; idempotent)
npm run enrich

# 5. Start the server
npm start          # http://localhost:3000  (PORT overridable in .env)
```

`db:setup` is idempotent (`CREATE TABLE IF NOT EXISTS`); `enrich` only touches
songs where `enriched_at IS NULL`, so it is safe to re-run and resume.

### Environment variables (`.env.example`)

| Variable            | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`      | Postgres connection string (Supabase).                     |
| `GEMINI_API_KEY`    | Google AI Studio key (free tier).                          |
| `GEMINI_CHAT_MODEL` | Chat model id (default `gemini-3.7-flash`).                |
| `RERANK_ENABLED`    | `false` disables the LLM rerank pass (see below).          |
| `PORT`              | Server port (default `3000`).                              |

## API

### `POST /api/recommend`
Body: `{ "moodText": "rainy sunday, need to focus", "username": "wan" }`
Returns: `{ "playlist": [{ id, title, artist, genre, reason }], "criteria": { genre, energy, tags } }`

```bash
curl -s localhost:3000/api/recommend \
  -H 'Content-Type: application/json' \
  -d '{"moodText":"upbeat music to study to","username":"wan"}'
```

### Songs catalog
| Method + path          | Description                        |
| ---------------------- | ---------------------------------- |
| `GET /api/songs`       | List all songs.                    |
| `POST /api/songs`      | Add a song (`{ title, artist, genre }`). |
| `DELETE /api/songs/:id`| Remove a song.                     |

### Health
`GET /api/health` → `{ "ok": true }`

## The `RERANK_ENABLED` toggle

The pipeline runs with or without the second (rerank) LLM call, so the
retrieve-only and retrieve+rerank paths can be demoed side by side:

- `RERANK_ENABLED=true` (default) — Gemini ranks candidates and writes a reason
  per song.
- `RERANK_ENABLED=false` — skip the rerank call; return the top candidates by
  SQL score with `reason: null`. Also the automatic fallback if a rerank call
  fails.

## Tests

```bash
npm test          # vitest run (no DB or network required)
npm run test:watch
```

Unit tests mock the network (`fetch`) and inject a spy for the database layer,
so the suite runs offline. The schema (`db:setup`) and enrichment (`enrich`)
steps are the DB/LLM integration checks and are verified by running them against
your own `.env`.

> **Testing note:** source is CommonJS and Vitest's `vi.mock` cannot intercept
> `require()`. Tests instead load the module-under-test and its dependency
> through one Node `require` (`createRequire`) and overwrite the dependency's
> exported functions with spies — see any `*.test.js` for the pattern.

## Frontend (React)

A Vite + React SPA in [`client/`](client/) is the whole UI — a username gate, a
mood → playlist page, and a songs catalog (add/list/delete) — styled with
Tailwind (dark theme) and routed with React Router.

- **Dev** (two servers, hot reload): `npm run dev` runs Express (`:3000`) and the
  Vite dev server (`:5173`), which proxies `/api` to Express. Open
  `http://localhost:5173`.
- **Prod** (one service): `npm run build` compiles the client into `client/dist`,
  which Express serves with an SPA fallback. Then `npm start` and open
  `http://localhost:3000`.
- **Frontend tests**: `npm --prefix client test` (Vitest + React Testing Library
  on jsdom; network mocked). The backend suite (`npm test`) is separate.

## Growing the catalog

Add rows (edit [`db/seed.sql`](db/seed.sql) or `POST /api/songs`), then re-run
`npm run enrich`. Reaching a few hundred songs is what makes playlists feel full.

## Roadmap

- ✅ **React + Vite frontend** — username gate, mood page, songs page (see
  [Frontend](#frontend-react)).
- **pgvector semantic search** — add an `embedding vector(768)` column and
  retrieve by cosine similarity to the embedded mood. Only the internals of
  `retrieveCandidates` change; the pipeline is untouched.
- **Deployment** — one Render web service (build `npm run build`, start
  `node app.js`) plus Supabase.
