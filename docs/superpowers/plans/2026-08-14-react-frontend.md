# React Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React SPA (Mood→playlist page + Songs CRUD page) that becomes the whole UI, served by the existing Express backend.

**Architecture:** A Vite + React app in `client/` with its own `package.json`. A thin `api.js` wraps `fetch`; custom hooks (`useRecommend`, `useSongs`, `useUsername`) own async state; components are presentational (props in, callbacks out); pages wire hooks to components. React Router gives `/` and `/songs`. Tailwind provides a modern dark theme. In dev, Vite (`:5173`) proxies `/api` to Express (`:3000`); in prod, `vite build` → `client/dist`, which Express already serves with an SPA fallback.

**Tech Stack:** React 18, Vite, React Router, Tailwind CSS v3, Vitest + React Testing Library + jsdom.

## Global Constraints

- Frontend is **JavaScript/JSX, ESM**, living in `client/` with its own `package.json`. Do **NOT** use TypeScript.
- **Tailwind CSS v3** (pin `^3.4`). Do not use v4 — its config model differs.
- **Node 18+**.
- All API calls use **relative `/api/...` paths** (Vite proxy in dev, same-origin in prod). Never hardcode `http://localhost`.
- Tests use **jsdom + mocked `fetch`/`api`**; no real backend or network. `vi.mock` works here because the frontend is ESM (unlike the backend's CommonJS suite).
- Presentational components receive data via **props** and emit via **callbacks**; pages wire hooks to components.
- Semantic Tailwind color tokens only: `bg`, `surface`, `border`, `text`, `muted`, `accent`, `accent-hover`. Default accent indigo `#6366f1`.
- `localStorage` username key: `asr:username`.
- Frontend tests run from `client/` (`npm --prefix client test`). The backend suite is unchanged.
- Every task ends with a commit.

## File Structure

```
client/
  package.json            React/Vite/Tailwind/Router/test deps + scripts
  index.html              Vite entry
  vite.config.js          React plugin, /api proxy, Vitest (jsdom) config
  postcss.config.js       Tailwind/autoprefixer
  tailwind.config.js      content globs + semantic color tokens
  src/
    main.jsx              React root
    index.css             Tailwind directives + base body styles
    setupTests.js         @testing-library/jest-dom
    api.js                fetch wrapper: recommend/getSongs/createSong/deleteSong + ApiError
    context/
      UsernameContext.jsx UsernameProvider + useUsername (localStorage-backed)
    hooks/
      useRecommend.js     submit(mood) → {loading,playlist,criteria,message,error}
      useSongs.js         {songs,loading,error,add,remove,reload}
    components/
      Button.jsx  GenreBadge.jsx  Skeleton.jsx  EmptyState.jsx
      CriteriaChips.jsx  SongCard.jsx  MoodInput.jsx  PlaylistResults.jsx
      AddSongForm.jsx  SongRow.jsx  SongList.jsx  NavBar.jsx  UsernameGate.jsx
    pages/
      MoodPage.jsx  SongsPage.jsx
    App.jsx               Router + providers + layout
```

Root `package.json` gains `dev` and `build` scripts and a `concurrently` dev dependency.

---

### Task 1: Scaffold client app + toolchain

**Files:**
- Create: `client/package.json`, `client/index.html`, `client/vite.config.js`, `client/postcss.config.js`, `client/tailwind.config.js`, `client/src/main.jsx`, `client/src/index.css`, `client/src/App.jsx`, `client/src/setupTests.js`, `client/src/toolchain.test.jsx`
- Modify: root `package.json` (add `dev`, `build` scripts; add `concurrently` devDependency)

**Interfaces:**
- Consumes: the Express server (`npm start`) for the dev proxy target.
- Produces: a runnable Vite app, `npm --prefix client test` (Vitest+RTL+jsdom), `npm --prefix client run build` → `client/dist`, and root `npm run dev`/`npm run build`.

- [ ] **Step 1: Create `client/package.json`**

```json
{
  "name": "ai-song-recommender-client",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `client/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Song Recommender</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `client/vite.config.js`**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
  },
});
```

- [ ] **Step 4: Create `client/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: Create `client/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0b0f",
        surface: "#16161d",
        border: "#26262f",
        text: "#e5e7eb",
        muted: "#9ca3af",
        accent: { DEFAULT: "#6366f1", hover: "#4f46e5" },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 6: Create `client/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

body {
  @apply bg-bg text-text;
}
```

- [ ] **Step 7: Create `client/src/main.jsx`**

```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 8: Create `client/src/App.jsx`** (placeholder; replaced in Task 8)

```jsx
export default function App() {
  return <p className="p-8">AI Song Recommender</p>;
}
```

- [ ] **Step 9: Create `client/src/setupTests.js`**

```js
import "@testing-library/jest-dom";
```

- [ ] **Step 10: Create the toolchain test** `client/src/toolchain.test.jsx`

```jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

function Hello() {
  return <p>hello vitest</p>;
}

describe("toolchain", () => {
  it("renders a component with RTL + jsdom", () => {
    render(<Hello />);
    expect(screen.getByText("hello vitest")).toBeInTheDocument();
  });
});
```

- [ ] **Step 11: Add root scripts + concurrently.** In the root `package.json`, add to `scripts`:

```json
"dev": "concurrently -n api,web -c blue,magenta \"npm start\" \"npm --prefix client run dev\"",
"build": "npm --prefix client install && npm --prefix client run build"
```

And add to root `devDependencies`:

```json
"concurrently": "^9.0.0"
```

- [ ] **Step 12: Install and verify**

Run: `npm --prefix client install`
Run: `npm --prefix client test`
Expected: 1 passing test (toolchain).
Run: `npm --prefix client run build`
Expected: builds successfully, creates `client/dist/index.html`.
Run: `npm install` (root, to add concurrently)

- [ ] **Step 13: Commit**

```bash
git add client package.json package-lock.json
git commit -m "chore: scaffold Vite + React + Tailwind client with vitest/RTL toolchain"
```

---

### Task 2: API client (`api.js`, TDD)

**Files:**
- Create: `client/src/api.js`
- Test: `client/src/api.test.js`

**Interfaces:**
- Consumes: global `fetch`; backend routes `/api/recommend`, `/api/songs`, `/api/songs/:id`.
- Produces:
  - `class ApiError extends Error { status }`
  - `recommend(moodText, username) -> Promise<{playlist, criteria, message?}>`
  - `getSongs() -> Promise<song[]>`
  - `createSong({title, artist, genre}) -> Promise<song>`
  - `deleteSong(id) -> Promise<null>`
  Consumed by the hooks (Tasks 4, 6).

- [ ] **Step 1: Write the failing test** `client/src/api.test.js`

```js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { recommend, getSongs, createSong, deleteSong, ApiError } from "./api.js";

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

beforeEach(() => {
  global.fetch = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("recommend", () => {
  it("POSTs moodText + username and returns the body", async () => {
    global.fetch.mockResolvedValue(jsonResponse({ playlist: [{ id: 1 }], criteria: { tags: ["x"] } }));
    const out = await recommend("chill", "wan");
    expect(out.playlist).toHaveLength(1);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe("/api/recommend");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ moodText: "chill", username: "wan" });
  });
  it("throws ApiError on non-2xx", async () => {
    global.fetch.mockResolvedValue(jsonResponse({ error: "bad" }, false, 400));
    await expect(recommend("x", "wan")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("songs api", () => {
  it("getSongs returns the songs array", async () => {
    global.fetch.mockResolvedValue(jsonResponse({ songs: [{ id: 1 }] }));
    expect(await getSongs()).toEqual([{ id: 1 }]);
  });
  it("createSong posts and returns the song", async () => {
    global.fetch.mockResolvedValue(jsonResponse({ song: { id: 3, title: "T" } }, true, 201));
    const song = await createSong({ title: "T", artist: "A", genre: "POP" });
    expect(song.id).toBe(3);
    expect(global.fetch.mock.calls[0][0]).toBe("/api/songs");
  });
  it("deleteSong sends DELETE and tolerates 204", async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error("no body"); } });
    await deleteSong(5);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe("/api/songs/5");
    expect(opts.method).toBe("DELETE");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix client test -- api.test.js`
Expected: FAIL — cannot import `./api.js`.

- [ ] **Step 3: Implement** `client/src/api.js`

```js
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (res.status === 204) {
    if (!res.ok) throw new ApiError("Request failed", res.status);
    return null;
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    throw new ApiError((body && body.error) || `Request failed (${res.status})`, res.status);
  }
  return body;
}

export function recommend(moodText, username) {
  return request("/api/recommend", {
    method: "POST",
    body: JSON.stringify({ moodText, username }),
  });
}

export async function getSongs() {
  const body = await request("/api/songs");
  return body.songs;
}

export async function createSong(song) {
  const body = await request("/api/songs", { method: "POST", body: JSON.stringify(song) });
  return body.song;
}

export function deleteSong(id) {
  return request(`/api/songs/${id}`, { method: "DELETE" });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix client test -- api.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add client/src/api.js client/src/api.test.js
git commit -m "feat(client): api.js fetch wrapper with ApiError and 204 handling"
```

---

### Task 3: Username context + gate (TDD)

**Files:**
- Create: `client/src/context/UsernameContext.jsx`, `client/src/components/Button.jsx`, `client/src/components/UsernameGate.jsx`
- Test: `client/src/context/UsernameContext.test.jsx`

**Interfaces:**
- Consumes: `localStorage`.
- Produces:
  - `<UsernameProvider>` and `useUsername() -> { username, setUsername(name), clearUsername() }` (localStorage key `asr:username`).
  - `<UsernameGate>{children}</UsernameGate>` — renders children only when a username exists; otherwise a name-entry screen.
  - `<Button>` — shared styled button.
  Consumed by App, NavBar, MoodPage (Tasks 5, 8).

- [ ] **Step 1: Write the failing test** `client/src/context/UsernameContext.test.jsx`

```jsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsernameProvider } from "./UsernameContext.jsx";
import UsernameGate from "../components/UsernameGate.jsx";

function Protected() {
  return <p>secret content</p>;
}

beforeEach(() => localStorage.clear());

describe("UsernameGate + context", () => {
  it("blocks content until a username is set, then persists it", async () => {
    render(
      <UsernameProvider>
        <UsernameGate>
          <Protected />
        </UsernameGate>
      </UsernameProvider>
    );
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("Your name"), "wan");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText("secret content")).toBeInTheDocument();
    expect(localStorage.getItem("asr:username")).toBe("wan");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix client test -- UsernameContext.test.jsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement** `client/src/context/UsernameContext.jsx`

```jsx
import { createContext, useContext, useState } from "react";

const KEY = "asr:username";
const UsernameContext = createContext(null);

export function UsernameProvider({ children }) {
  const [username, setUsernameState] = useState(() => localStorage.getItem(KEY) || "");
  const setUsername = (name) => {
    const v = String(name || "").trim();
    if (!v) return;
    localStorage.setItem(KEY, v);
    setUsernameState(v);
  };
  const clearUsername = () => {
    localStorage.removeItem(KEY);
    setUsernameState("");
  };
  return (
    <UsernameContext.Provider value={{ username, setUsername, clearUsername }}>
      {children}
    </UsernameContext.Provider>
  );
}

export function useUsername() {
  const ctx = useContext(UsernameContext);
  if (!ctx) throw new Error("useUsername must be used within UsernameProvider");
  return ctx;
}
```

- [ ] **Step 4: Implement** `client/src/components/Button.jsx`

```jsx
export default function Button({ children, className = "", ...props }) {
  return (
    <button
      className={`rounded-lg bg-accent px-4 py-2 font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 5: Implement** `client/src/components/UsernameGate.jsx`

```jsx
import { useState } from "react";
import { useUsername } from "../context/UsernameContext.jsx";
import Button from "./Button.jsx";

export default function UsernameGate({ children }) {
  const { username, setUsername } = useUsername();
  const [value, setValue] = useState("");
  if (username) return children;
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-16">
      <h1 className="text-xl font-semibold text-text">What should we call you?</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setUsername(value);
        }}
        className="space-y-3"
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-xl border border-border bg-surface p-3 text-text placeholder-muted outline-none focus:border-accent"
        />
        <Button type="submit" disabled={!value.trim()} className="w-full">
          Continue
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm --prefix client test -- UsernameContext.test.jsx`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add client/src/context client/src/components/Button.jsx client/src/components/UsernameGate.jsx
git commit -m "feat(client): username context + gate with localStorage persistence"
```

---

### Task 4: `useRecommend` hook (TDD)

**Files:**
- Create: `client/src/hooks/useRecommend.js`
- Test: `client/src/hooks/useRecommend.test.jsx`

**Interfaces:**
- Consumes: `recommend` from `api.js` (Task 2).
- Produces: `useRecommend(username) -> { submit(moodText), loading, playlist, criteria, message, error }`. Consumed by `MoodPage` (Task 5).

- [ ] **Step 1: Write the failing test** `client/src/hooks/useRecommend.test.jsx`

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRecommend } from "./useRecommend.js";
import * as api from "../api.js";

vi.mock("../api.js");

beforeEach(() => vi.resetAllMocks());

describe("useRecommend", () => {
  it("submits and exposes the playlist", async () => {
    api.recommend.mockResolvedValue({ playlist: [{ id: 1, title: "A" }], criteria: { tags: ["x"] }, message: null });
    const { result } = renderHook(() => useRecommend("wan"));
    act(() => {
      result.current.submit("chill");
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.playlist).toHaveLength(1);
    expect(api.recommend).toHaveBeenCalledWith("chill", "wan");
  });
  it("exposes an error on failure", async () => {
    api.recommend.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useRecommend("wan"));
    act(() => {
      result.current.submit("x");
    });
    await waitFor(() => expect(result.current.error).toBe("boom"));
    expect(result.current.playlist).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix client test -- useRecommend.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `client/src/hooks/useRecommend.js`

```js
import { useState } from "react";
import { recommend } from "../api.js";

const INITIAL = { loading: false, playlist: null, criteria: null, message: null, error: null };

export function useRecommend(username) {
  const [state, setState] = useState(INITIAL);

  const submit = async (moodText) => {
    setState({ ...INITIAL, loading: true });
    try {
      const data = await recommend(moodText, username);
      setState({
        loading: false,
        playlist: data.playlist,
        criteria: data.criteria,
        message: data.message ?? null,
        error: null,
      });
    } catch (e) {
      setState({ ...INITIAL, error: e.message || "Something went wrong" });
    }
  };

  return { ...state, submit };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix client test -- useRecommend.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/useRecommend.js client/src/hooks/useRecommend.test.jsx
git commit -m "feat(client): useRecommend hook with loading/error state"
```

---

### Task 5: Mood page + presentational components (TDD)

**Files:**
- Create: `client/src/components/GenreBadge.jsx`, `client/src/components/Skeleton.jsx`, `client/src/components/EmptyState.jsx`, `client/src/components/CriteriaChips.jsx`, `client/src/components/SongCard.jsx`, `client/src/components/MoodInput.jsx`, `client/src/components/PlaylistResults.jsx`, `client/src/pages/MoodPage.jsx`
- Test: `client/src/components/MoodComponents.test.jsx`

**Interfaces:**
- Consumes: `useRecommend` (Task 4), `useUsername` (Task 3), `Button` (Task 3).
- Produces:
  - `MoodInput({ onSubmit, loading })`, `PlaylistResults({ loading, playlist, criteria, message, error })`, `SongCard({ song })`, `CriteriaChips({ criteria })`, `Skeleton({ count })`, `EmptyState({ message })`, `GenreBadge({ genre })`.
  - `MoodPage` (default export) — route `/`. Consumed by App (Task 8).

- [ ] **Step 1: Write the failing test** `client/src/components/MoodComponents.test.jsx`

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MoodInput from "./MoodInput.jsx";
import PlaylistResults from "./PlaylistResults.jsx";
import SongCard from "./SongCard.jsx";

describe("MoodInput", () => {
  it("calls onSubmit with trimmed text", async () => {
    const onSubmit = vi.fn();
    render(<MoodInput onSubmit={onSubmit} loading={false} />);
    await userEvent.type(screen.getByPlaceholderText(/describe a mood/i), "  chill  ");
    await userEvent.click(screen.getByRole("button", { name: /get playlist/i }));
    expect(onSubmit).toHaveBeenCalledWith("chill");
  });
  it("disables the button while loading", () => {
    render(<MoodInput onSubmit={() => {}} loading={true} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("PlaylistResults", () => {
  it("shows a skeleton while loading", () => {
    render(<PlaylistResults loading={true} playlist={null} />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });
  it("shows the empty message when playlist is empty", () => {
    render(<PlaylistResults loading={false} playlist={[]} message="Nothing found" />);
    expect(screen.getByText("Nothing found")).toBeInTheDocument();
  });
  it("renders song cards with reasons", () => {
    render(
      <PlaylistResults
        loading={false}
        playlist={[{ id: 1, title: "A", artist: "x", genre: "POP", reason: "fits" }]}
        criteria={{ tags: ["chill"] }}
      />
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("fits")).toBeInTheDocument();
  });
});

describe("SongCard", () => {
  it("renders title, artist, genre", () => {
    render(<SongCard song={{ id: 1, title: "A", artist: "x", genre: "POP", reason: null }} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("x")).toBeInTheDocument();
    expect(screen.getByText("POP")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix client test -- MoodComponents.test.jsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `client/src/components/GenreBadge.jsx`**

```jsx
export default function GenreBadge({ genre }) {
  if (!genre) return null;
  return (
    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">{genre}</span>
  );
}
```

- [ ] **Step 4: Implement `client/src/components/Skeleton.jsx`**

```jsx
export default function Skeleton({ count = 3 }) {
  return (
    <div className="space-y-3" data-testid="skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-surface" />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Implement `client/src/components/EmptyState.jsx`**

```jsx
export default function EmptyState({ message }) {
  return (
    <p className="rounded-xl border border-border bg-surface p-6 text-center text-muted">{message}</p>
  );
}
```

- [ ] **Step 6: Implement `client/src/components/CriteriaChips.jsx`**

```jsx
export default function CriteriaChips({ criteria }) {
  if (!criteria) return null;
  const chips = [];
  if (criteria.energy != null) chips.push(`energy ${criteria.energy}`);
  if (criteria.genre) chips.push(criteria.genre);
  (criteria.tags || []).forEach((t) => chips.push(t));
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" data-testid="criteria-chips">
      {chips.map((c) => (
        <span key={c} className="rounded-full bg-accent/15 px-3 py-1 text-xs text-accent">
          {c}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Implement `client/src/components/SongCard.jsx`**

```jsx
import GenreBadge from "./GenreBadge.jsx";

export default function SongCard({ song }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-text">{song.title}</h3>
        <GenreBadge genre={song.genre} />
      </div>
      <p className="text-sm text-muted">{song.artist}</p>
      {song.reason && <p className="mt-2 text-sm text-text/80">{song.reason}</p>}
    </article>
  );
}
```

- [ ] **Step 8: Implement `client/src/components/MoodInput.jsx`**

```jsx
import { useState } from "react";
import Button from "./Button.jsx";

const MAX = 500;

export default function MoodInput({ onSubmit, loading }) {
  const [text, setText] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (t) onSubmit(t);
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX}
        rows={3}
        placeholder="Describe a mood… e.g. calm rainy night to focus"
        className="w-full resize-none rounded-xl border border-border bg-surface p-4 text-text placeholder-muted outline-none focus:border-accent"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          {text.length}/{MAX}
        </span>
        <Button type="submit" disabled={loading || !text.trim()}>
          {loading ? "Finding songs…" : "Get playlist"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 9: Implement `client/src/components/PlaylistResults.jsx`**

```jsx
import SongCard from "./SongCard.jsx";
import CriteriaChips from "./CriteriaChips.jsx";
import Skeleton from "./Skeleton.jsx";
import EmptyState from "./EmptyState.jsx";

export default function PlaylistResults({ loading, playlist, criteria, message, error }) {
  if (loading) return <Skeleton />;
  if (error)
    return (
      <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
        {error}
      </p>
    );
  if (playlist == null) return null;
  if (playlist.length === 0)
    return <EmptyState message={message || "No matching songs. Try a different mood."} />;
  return (
    <div className="space-y-4">
      <CriteriaChips criteria={criteria} />
      <div className="grid gap-3">
        {playlist.map((s) => (
          <SongCard key={s.id} song={s} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Implement `client/src/pages/MoodPage.jsx`**

```jsx
import MoodInput from "../components/MoodInput.jsx";
import PlaylistResults from "../components/PlaylistResults.jsx";
import { useUsername } from "../context/UsernameContext.jsx";
import { useRecommend } from "../hooks/useRecommend.js";

export default function MoodPage() {
  const { username } = useUsername();
  const { submit, loading, playlist, criteria, message, error } = useRecommend(username);
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <MoodInput onSubmit={submit} loading={loading} />
      <PlaylistResults
        loading={loading}
        playlist={playlist}
        criteria={criteria}
        message={message}
        error={error}
      />
    </section>
  );
}
```

- [ ] **Step 11: Run tests to verify they pass**

Run: `npm --prefix client test -- MoodComponents.test.jsx`
Expected: PASS (6 tests).

- [ ] **Step 12: Commit**

```bash
git add client/src/components client/src/pages/MoodPage.jsx
git commit -m "feat(client): mood page, playlist results, song card + presentational components"
```

---

### Task 6: `useSongs` hook (TDD)

**Files:**
- Create: `client/src/hooks/useSongs.js`
- Test: `client/src/hooks/useSongs.test.jsx`

**Interfaces:**
- Consumes: `getSongs`, `createSong`, `deleteSong` from `api.js` (Task 2).
- Produces: `useSongs() -> { songs, loading, error, add(song), remove(id), reload() }`. Loads on mount. Consumed by `SongsPage` (Task 7).

- [ ] **Step 1: Write the failing test** `client/src/hooks/useSongs.test.jsx`

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSongs } from "./useSongs.js";
import * as api from "../api.js";

vi.mock("../api.js");

beforeEach(() => vi.resetAllMocks());

describe("useSongs", () => {
  it("loads songs on mount", async () => {
    api.getSongs.mockResolvedValue([{ id: 1, title: "A" }]);
    const { result } = renderHook(() => useSongs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.songs).toHaveLength(1);
  });
  it("add prepends the created song", async () => {
    api.getSongs.mockResolvedValue([]);
    api.createSong.mockResolvedValue({ id: 2, title: "New" });
    const { result } = renderHook(() => useSongs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.add({ title: "New", artist: "X" });
    });
    expect(result.current.songs[0]).toMatchObject({ id: 2 });
  });
  it("remove drops the song", async () => {
    api.getSongs.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    api.deleteSong.mockResolvedValue(null);
    const { result } = renderHook(() => useSongs());
    await waitFor(() => expect(result.current.songs).toHaveLength(2));
    await act(async () => {
      await result.current.remove(1);
    });
    expect(result.current.songs.map((s) => s.id)).toEqual([2]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix client test -- useSongs.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `client/src/hooks/useSongs.js`

```js
import { useCallback, useEffect, useState } from "react";
import { getSongs, createSong, deleteSong } from "../api.js";

export function useSongs() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSongs(await getSongs());
    } catch (e) {
      setError(e.message || "Failed to load songs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = async (song) => {
    const created = await createSong(song);
    setSongs((prev) => [created, ...prev]);
    return created;
  };

  const remove = async (id) => {
    await deleteSong(id);
    setSongs((prev) => prev.filter((s) => s.id !== id));
  };

  return { songs, loading, error, add, remove, reload };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix client test -- useSongs.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/useSongs.js client/src/hooks/useSongs.test.jsx
git commit -m "feat(client): useSongs hook (load/add/remove)"
```

---

### Task 7: Songs page + components (TDD)

**Files:**
- Create: `client/src/components/AddSongForm.jsx`, `client/src/components/SongRow.jsx`, `client/src/components/SongList.jsx`, `client/src/pages/SongsPage.jsx`
- Test: `client/src/components/SongsComponents.test.jsx`

**Interfaces:**
- Consumes: `useSongs` (Task 6), `Button` (Task 3), `GenreBadge` + `EmptyState` (Task 5).
- Produces:
  - `AddSongForm({ onAdd })` — calls `onAdd({title, artist, genre})`; genre is `null` when blank.
  - `SongRow({ song, onDelete })`, `SongList({ songs, onDelete })`.
  - `SongsPage` (default export) — route `/songs`. Consumed by App (Task 8).

- [ ] **Step 1: Write the failing test** `client/src/components/SongsComponents.test.jsx`

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddSongForm from "./AddSongForm.jsx";
import SongList from "./SongList.jsx";

describe("AddSongForm", () => {
  it("requires title and artist", async () => {
    const onAdd = vi.fn();
    render(<AddSongForm onAdd={onAdd} />);
    await userEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });
  it("submits title/artist/genre (blank genre → null)", async () => {
    const onAdd = vi.fn().mockResolvedValue({ id: 1 });
    render(<AddSongForm onAdd={onAdd} />);
    await userEvent.type(screen.getByPlaceholderText("Title"), "T");
    await userEvent.type(screen.getByPlaceholderText("Artist"), "A");
    await userEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(onAdd).toHaveBeenCalledWith({ title: "T", artist: "A", genre: null });
  });
});

describe("SongList", () => {
  it("shows empty state with no songs", () => {
    render(<SongList songs={[]} onDelete={() => {}} />);
    expect(screen.getByText(/no songs yet/i)).toBeInTheDocument();
  });
  it("calls onDelete with the id", async () => {
    const onDelete = vi.fn();
    render(<SongList songs={[{ id: 7, title: "A", artist: "x" }]} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole("button", { name: /delete a/i }));
    expect(onDelete).toHaveBeenCalledWith(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix client test -- SongsComponents.test.jsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `client/src/components/AddSongForm.jsx`**

```jsx
import { useState } from "react";
import Button from "./Button.jsx";

const EMPTY = { title: "", artist: "", genre: "" };

export default function AddSongForm({ onAdd }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.artist.trim()) {
      setError("Title and artist are required");
      return;
    }
    setError(null);
    try {
      await onAdd({
        title: form.title.trim(),
        artist: form.artist.trim(),
        genre: form.genre.trim() || null,
      });
      setForm(EMPTY);
    } catch (err) {
      setError(err.message || "Failed to add");
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-4">
      <input value={form.title} onChange={change("title")} placeholder="Title" className="rounded-lg border border-border bg-bg p-2 text-text placeholder-muted outline-none focus:border-accent" />
      <input value={form.artist} onChange={change("artist")} placeholder="Artist" className="rounded-lg border border-border bg-bg p-2 text-text placeholder-muted outline-none focus:border-accent" />
      <input value={form.genre} onChange={change("genre")} placeholder="Genre (optional)" className="rounded-lg border border-border bg-bg p-2 text-text placeholder-muted outline-none focus:border-accent" />
      <Button type="submit">Add</Button>
      {error && <p className="text-sm text-red-300 sm:col-span-4">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 4: Implement `client/src/components/SongRow.jsx`**

```jsx
import GenreBadge from "./GenreBadge.jsx";

export default function SongRow({ song, onDelete }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <div>
        <p className="font-medium text-text">{song.title}</p>
        <p className="text-sm text-muted">{song.artist}</p>
      </div>
      <div className="flex items-center gap-3">
        <GenreBadge genre={song.genre} />
        <button
          onClick={() => onDelete(song.id)}
          aria-label={`Delete ${song.title}`}
          className="text-sm text-muted hover:text-red-300"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
```

- [ ] **Step 5: Implement `client/src/components/SongList.jsx`**

```jsx
import SongRow from "./SongRow.jsx";
import EmptyState from "./EmptyState.jsx";

export default function SongList({ songs, onDelete }) {
  if (songs.length === 0) return <EmptyState message="No songs yet. Add one above." />;
  return (
    <ul className="space-y-2">
      {songs.map((s) => (
        <SongRow key={s.id} song={s} onDelete={onDelete} />
      ))}
    </ul>
  );
}
```

- [ ] **Step 6: Implement `client/src/pages/SongsPage.jsx`**

```jsx
import AddSongForm from "../components/AddSongForm.jsx";
import SongList from "../components/SongList.jsx";
import { useSongs } from "../hooks/useSongs.js";

export default function SongsPage() {
  const { songs, loading, error, add, remove } = useSongs();
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <AddSongForm onAdd={add} />
      {loading && <p className="text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}
      {!loading && !error && <SongList songs={songs} onDelete={remove} />}
    </section>
  );
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm --prefix client test -- SongsComponents.test.jsx`
Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add client/src/components/AddSongForm.jsx client/src/components/SongRow.jsx client/src/components/SongList.jsx client/src/pages/SongsPage.jsx
git commit -m "feat(client): songs page with add form and deletable list"
```

---

### Task 8: App shell — routing, nav, layout (TDD)

**Files:**
- Create: `client/src/components/NavBar.jsx`
- Modify: `client/src/App.jsx` (replace placeholder)
- Modify: `client/src/toolchain.test.jsx` (rename/replace with an App routing test) — delete `client/src/toolchain.test.jsx`, create `client/src/App.test.jsx`
- Test: `client/src/App.test.jsx`

**Interfaces:**
- Consumes: `UsernameProvider` + `UsernameGate` (Task 3), `NavBar`, `MoodPage` (Task 5), `SongsPage` (Task 7), `useUsername` (Task 3).
- Produces: the composed `App` (default export) with routes `/` and `/songs`.

- [ ] **Step 1: Delete the toolchain test and write the failing App test**

Run: `git rm client/src/toolchain.test.jsx`

Create `client/src/App.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import * as api from "./api.js";

vi.mock("./api.js");

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("asr:username", "wan");
  api.getSongs.mockResolvedValue([]);
});

describe("App", () => {
  it("shows the Mood page by default and navigates to Songs", async () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/describe a mood/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: /songs/i }));
    expect(screen.getByPlaceholderText("Title")).toBeInTheDocument();
  });

  it("gates behind the username screen when none is set", () => {
    localStorage.clear();
    render(<App />);
    expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/describe a mood/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix client test -- App.test.jsx`
Expected: FAIL — `NavBar` not found / App is still the placeholder.

- [ ] **Step 3: Implement `client/src/components/NavBar.jsx`**

```jsx
import { NavLink } from "react-router-dom";
import { useUsername } from "../context/UsernameContext.jsx";

export default function NavBar() {
  const { username, clearUsername } = useUsername();
  const link = ({ isActive }) =>
    `rounded-lg px-3 py-1.5 text-sm ${isActive ? "bg-accent text-white" : "text-muted hover:text-text"}`;
  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          <NavLink to="/" className={link} end>
            Mood
          </NavLink>
          <NavLink to="/songs" className={link}>
            Songs
          </NavLink>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>{username}</span>
          <button onClick={clearUsername} className="hover:text-text" aria-label="Change username">
            ✎
          </button>
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 4: Replace `client/src/App.jsx`**

```jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UsernameProvider } from "./context/UsernameContext.jsx";
import UsernameGate from "./components/UsernameGate.jsx";
import NavBar from "./components/NavBar.jsx";
import MoodPage from "./pages/MoodPage.jsx";
import SongsPage from "./pages/SongsPage.jsx";

export default function App() {
  return (
    <UsernameProvider>
      <BrowserRouter>
        <UsernameGate>
          <div className="min-h-screen bg-bg text-text">
            <NavBar />
            <main className="px-4 py-8">
              <Routes>
                <Route path="/" element={<MoodPage />} />
                <Route path="/songs" element={<SongsPage />} />
              </Routes>
            </main>
          </div>
        </UsernameGate>
      </BrowserRouter>
    </UsernameProvider>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm --prefix client test -- App.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Run the full client suite + build**

Run: `npm --prefix client test`
Expected: all client tests PASS.
Run: `npm --prefix client run build`
Expected: builds to `client/dist` with no errors.

- [ ] **Step 7: Commit**

```bash
git add client/src/App.jsx client/src/components/NavBar.jsx client/src/App.test.jsx
git commit -m "feat(client): app shell with routing, nav bar, and username gate"
```

---

### Task 9: Manual integration verification + README note

**Files:**
- Modify: `README.md` (add a "Frontend" section)

**Interfaces:**
- Consumes: everything above; the live backend + Supabase.
- Produces: documentation and a verified end-to-end run.

> **Verification note:** this is a manual full-stack check against your live `.env` (Supabase + Gemini), not a unit test.

- [ ] **Step 1: Full-stack manual check**

Run: `npm run dev` (starts Express :3000 and Vite :5173)
In the browser at `http://localhost:5173`:
- Enter a username → gate closes.
- On the Mood page, submit "calm rainy night to focus" → a skeleton appears, then a playlist of cards with reasons + criteria chips.
- Go to Songs → the seeded catalog lists; add a song; delete it.

- [ ] **Step 2: Production-mode check (single service)**

Run: `npm run build`
Run: `npm start`
Open `http://localhost:3000` → the built SPA loads and the same flows work (served by Express).

- [ ] **Step 3: Add a "Frontend" section to `README.md`** covering: `client/` stack (Vite + React + Tailwind + Router), `npm run dev` (both servers via the Vite `/api` proxy), `npm run build` → `client/dist` served by Express, and `npm --prefix client test` for frontend tests.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document the React frontend (dev, build, test)"
```

---

## Self-Review

**1. Spec coverage:**
- Vite + React SPA, JS/JSX → Tasks 1, 8. ✅
- Tailwind dark theme + semantic tokens → Tasks 1 (config), 3–8 (usage). ✅
- React Router `/` + `/songs` → Task 8. ✅
- Thin `api.js` → Task 2. ✅
- Custom hooks `useRecommend`/`useSongs`/`useUsername` → Tasks 4, 6, 3. ✅
- Username gate via localStorage (`asr:username`) → Task 3. ✅
- Mood page: MoodInput, PlaylistResults, SongCard, CriteriaChips, skeleton/empty/error → Task 5. ✅
- Songs page: AddSongForm, SongList/SongRow, delete → Task 7. ✅
- Dev proxy + prod static/SPA fallback (already wired) → Tasks 1 (proxy), 9 (verify). ✅
- Vitest + RTL + jsdom, fetch/api mocked → Tasks 1–8. ✅
- Root `dev`/`build` scripts + concurrently → Task 1. ✅

**2. Placeholder scan:** No TBD/TODO; every code step contains real code. Task 9 Step 3 describes required README sections (a docs step) rather than pasting prose — acceptable. ✅

**3. Type consistency:** Playlist card shape `{id,title,artist,genre,reason}` consistent (api → useRecommend → PlaylistResults → SongCard). `useRecommend` returns `{submit,loading,playlist,criteria,message,error}` — consumed exactly by MoodPage. `useSongs` returns `{songs,loading,error,add,remove,reload}` — consumed exactly by SongsPage. `api.js` names (`recommend`,`getSongs`,`createSong`,`deleteSong`,`ApiError`) match hook imports. `useUsername` `{username,setUsername,clearUsername}` consistent across UsernameGate, NavBar, MoodPage. ✅

## Notes on frontend testing

Unlike the backend (CommonJS, where `vi.mock` cannot intercept `require`), the frontend is ESM, so `vi.mock("../api.js")` works normally for hook tests. Presentational components are prop-driven and need no mocking. Page/App tests mock `api.js` to avoid real network calls in jsdom.
