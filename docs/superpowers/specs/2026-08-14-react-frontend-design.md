# React Frontend — Design Spec

**Date:** 2026-08-14
**Author:** Wan Hafizuddin
**Status:** Approved (design), pending implementation plan

## 1. Context & goals

The backend AI pipeline (extract → retrieve → rank over a Supabase Postgres
catalog) is built, tested, and live (see
[`2026-08-14-ai-song-recommender-design.md`](2026-08-14-ai-song-recommender-design.md)
and the backend plan). This spec covers the **React SPA** that becomes the whole
UI — the second portfolio gap the project set out to close ("no
frontend-framework experience").

### Success criteria

- A user sets a username once, types a free-text mood, and sees a curated
  playlist of real songs, each with the AI-written reason.
- A Songs page supports add / list / delete against the JSON API.
- The SPA is served by the same Express service in production (`client/dist`
  via the SPA fallback already wired in `app.js`).
- Clean, responsive, modern-dark UI built with Tailwind.
- A light but real component/test suite.

### Non-goals (YAGNI)

- Real authentication (username-only identity, as in the backend design).
- Global state libraries (Redux/Zustand) — local state + custom hooks suffice.
- React Query / SWR — two endpoints don't justify the dependency.
- TypeScript — the codebase is JS; the frontend stays JS/JSX for consistency.
- Playlist persistence UI / mood history screen — backend stores history, but
  surfacing it is a later plan.

## 2. Architecture

Single service. A Vite + React SPA lives in `client/` and talks to the existing
Express JSON API.

```
client/ (Vite + React + Tailwind + React Router)
  dev:  Vite dev server :5173  ──/api proxy──►  Express :3000
  prod: `vite build` → client/dist  ──served by──►  Express (static + SPA fallback)
```

- **Dev:** Vite runs on `5173` and proxies `/api/*` to `http://localhost:3000`.
  Root `npm run dev` runs Express + Vite together via `concurrently`.
- **Prod:** `npm run build` produces `client/dist`; Express already serves it
  with an SPA fallback for non-`/api` routes (built in the backend plan). One
  Render service.

The frontend has its **own `package.json`** in `client/` (React/Vite/Tailwind/
router/test deps), keeping frontend and backend dependency trees separate.

## 3. Tech stack

- **React 18** + **Vite** (`@vitejs/plugin-react`), JavaScript/JSX.
- **Tailwind CSS** for styling (dark theme).
- **React Router** (`react-router-dom`) for `/` and `/songs`.
- **Vitest** + **React Testing Library** + **jsdom** for tests.
- **concurrently** (root dev dep) to run both servers in dev.

## 4. Data & state — thin API layer + custom hooks

The one architectural decision: keep data-fetching out of components.

- **`client/src/api.js`** — one module that owns all HTTP. Functions:
  - `recommend(moodText, username) -> { playlist, criteria, message? }`
  - `getSongs() -> song[]`
  - `createSong({ title, artist, genre }) -> song`
  - `deleteSong(id) -> void`

  It wraps `fetch`, sets JSON headers, throws a typed `ApiError` (with status +
  message) on non-2xx, and returns parsed JSON. All requests go to relative
  `/api/...` (dev proxy or same-origin in prod).

- **Custom hooks** own loading/error/data state so components stay
  presentational:
  - `useRecommend()` → `{ submit(moodText), playlist, criteria, message, loading, error }`
  - `useSongs()` → `{ songs, loading, error, add(song), remove(id), reload() }`
  - `useUsername()` → `{ username, setUsername(name) }`, backed by `localStorage`
    (key `asr:username`).

## 5. Identity — username gate

Lightweight identity, matching the backend (`findOrCreateByUsername`).

- On load, `useUsername()` reads `localStorage`.
- `UsernameGate` wraps the app: if there is no username, it renders a single
  input ("What should we call you?") and nothing else until a name is set.
- Once set, the username is passed to `recommend()` on every mood submission.
  A small header control lets the user change/clear it.

## 6. Pages & components

Routes via React Router, inside a shared layout (`NavBar` + `<Outlet/>`).

**`MoodPage` (`/`)** — the headline.
- `MoodInput`: textarea (maps to `moodText`, ~500 char cap mirroring the API) +
  a submit button; disabled while loading.
- On submit → `useRecommend().submit()`.
- `PlaylistResults`: renders states —
  - **loading**: `Skeleton` cards (LLM latency is 1–3s).
  - **success**: a `CriteriaChips` row (energy + tags the AI extracted) above a
    list of `SongCard`s (title, artist, genre badge, AI `reason`).
  - **empty**: `EmptyState` using the API's `message` when `playlist` is `[]`.
  - **error**: inline error message with a retry affordance.

**`SongsPage` (`/songs`)** — catalog management.
- `AddSongForm`: title/artist/genre inputs → `useSongs().add()`; validates
  title+artist required (mirrors the API's 400).
- `SongList`: `SongRow`s (title, artist, genre, energy/tags if enriched) each
  with a delete button → `useSongs().remove(id)` (204/404 handled).

**Shared UI**: `NavBar`, `SongCard`, `Skeleton`, `EmptyState`, `CriteriaChips`,
`Button`, `GenreBadge`.

## 7. Styling — modern dark, music-app feel

Tailwind, dark theme. A small set of semantic colors defined in
`tailwind.config.js` (extended palette), used consistently:

- `bg` near-black background, `surface` slightly lighter for cards,
  `border` subtle, `text`/`muted` for primary/secondary text, and one vibrant
  `accent` — default **indigo** (`#6366f1`-ish) — for actions, active nav, and
  criteria chips. The accent is a single semantic token, so it's swappable in
  one place.
- Card-based layout, rounded corners, generous spacing, responsive (single
  column on mobile, comfortable max-width on desktop). Accessible contrast.

## 8. Error, loading & empty states

- Every async action has explicit loading and error handling via its hook.
- Mood submit: skeleton while loading; inline error on failure; empty state on
  no matches (backend already returns a friendly `message`).
- Songs: optimistic-free but responsive add/delete with error surfacing.
- Network/API errors never crash the app — hooks catch and expose `error`.

## 9. Testing

Vitest + React Testing Library (jsdom), `fetch` mocked. Light but real:

- `api.js`: builds correct URL/method/body; throws `ApiError` on non-2xx.
- `useRecommend` / `useSongs`: loading→success and loading→error transitions.
- `MoodInput`: submitting calls the handler with the typed text; disabled while
  loading.
- `SongCard` / `PlaylistResults`: renders reason; shows empty state on `[]`.

Frontend tests run from `client/` (`npm test` inside `client/`), separate from
the backend Vitest suite.

## 10. Tooling & scripts

- **`client/vite.config.js`**: React plugin + `server.proxy` mapping `/api` →
  `http://localhost:3000`; Vitest config (jsdom environment, setup file for
  RTL matchers).
- **`client/tailwind.config.js`** + `postcss.config.js` + a Tailwind entry CSS.
- **Root `package.json` scripts** (added):
  - `dev`: `concurrently "npm start" "npm --prefix client run dev"`
  - `build`: `npm --prefix client install && npm --prefix client run build`
    (outputs `client/dist`, which `app.js` serves).
- `.gitignore` already excludes `client/dist/`.

## 11. Decisions log

| Decision | Choice | Why |
|---|---|---|
| Scope | Both pages (Mood + Songs CRUD) | Ships the star feature and shows full CRUD in React |
| Styling | Tailwind CSS | Fast, clean, industry-relevant; good talking point |
| Routing | React Router | Real URLs, pairs with the existing SPA fallback |
| Aesthetic | Modern dark, music-app feel | On-theme and memorable for a portfolio |
| Data/state | Thin `api.js` + custom hooks | Separation + testability without heavy deps |
| Language | JS/JSX | Consistency with the JS backend |
| Frontend deps | Separate `client/package.json` | Keeps frontend/backend trees isolated |

## 12. Stretch / future

- Mood history screen (backend already persists `mood_queries`).
- Optimistic UI for add/delete.
- Skeleton polish / subtle animations.
- Deploy config (Render build = `npm run build`, start = `node app.js`) — its
  own deployment plan.
