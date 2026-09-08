# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This repo has two independent parts: a frontend (root) and a backend API (`server/`). **They are not yet wired together** — the frontend still persists to `localStorage` and has its own single-user `Match` model; the backend has a separate multi-player/ELO model backed by Postgres. Connecting them (replacing the frontend's `useLocalStorage` calls with `fetch`s to the API) is future work.

## Commands

Frontend (repo root):
- `npm run dev` — start the Vite dev server (default port 5173)
- `npm run build` — typecheck (`tsc -b`) then production build to `dist/`
- `npm run lint` — run oxlint over the codebase
- `npm run preview` — serve the production build locally

Backend (`server/`):
- `npm run dev` — start the API with hot reload (`tsx watch`), default port 3001
- `npm run migrate` — run `src/schema.sql` against `DATABASE_URL` to create/update tables
- `npm run build` / `npm start` — compile to `dist/` and run the compiled server

There is no test runner configured for either part yet.

## Architecture

### Frontend (mobile-first React SPA)

Vite + React 19 + TypeScript. No network calls — all data lives in the browser via `localStorage`.

- **State & persistence**: `src/hooks/useLocalStorage.ts` is a generic `useState` + `localStorage` sync hook. `App.tsx` is the single source of truth for match data (`useLocalStorage<Match[]>('tennis-matches', [])`) and passes `matches`/mutator callbacks down as props — there is no global store or context.
- **Domain model**: `src/types/match.ts` defines `Match` (id, date, opponent, result, sets, notes) — a single-user model (logged-in player vs. a named opponent), distinct from the backend's two-player model below.
- **Derived stats**: `src/lib/stats.ts` computes win/loss/win-rate from the matches array on every render — kept as a pure function rather than stored state, so it never drifts from the source data.
- **Components** (`src/components/`): `MatchForm` (controlled form with dynamic set rows), `MatchList` (sorted newest-first, delete-in-place), `StatsSummary` (summary tiles). Each is presentational and receives data/callbacks from `App.tsx` — no component reads or writes `localStorage` directly.
- **Styling**: Tailwind CSS v4 via the `@tailwindcss/vite` plugin (not the old PostCSS/config-file setup — there is no `tailwind.config.js`). Global styles/import live in `src/index.css`. Layout is constrained to `max-w-md` and built mobile-first since the app is meant to be used courtside on a phone; dark mode is handled via Tailwind `dark:` classes.
- IDs are generated with `crypto.randomUUID()`, dates stored as `YYYY-MM-DD` strings (from `<input type="date">`). Keep persistence logic inside `useLocalStorage`/`App.tsx` — don't reach into `localStorage` from leaf components.

### Backend (`server/`) — Express + Postgres API

Built to support multiple people logging matches against a shared, ELO-rated leaderboard (unlike the frontend's single-user model). Deployed independently of the frontend (e.g. Railway for the API + Postgres, Vercel for the static frontend).

- **`src/db.ts`**: a `pg` `Pool`, configured from `DATABASE_URL` if set, else discrete `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` vars. Never hits localStorage or the frontend's data model.
- **`src/schema.sql`**: two tables — `players` (name, `elo`, starts at 1200) and `matches` (two player FKs, `sets` as `JSONB`, `winner_id`, each player's post-match ELO). Applied via `npm run migrate` (`src/migrate.ts`), not a migration framework — schema changes mean editing `schema.sql` (idempotent `CREATE TABLE IF NOT EXISTS`) and re-running migrate.
- **`src/elo.ts`**: pure function `computeEloUpdate(ratingA, ratingB, aWon)`, standard ELO with K-factor 32. No I/O — safe to unit test directly.
- **`src/index.ts`**: routes for `GET/POST /api/players` and `GET/POST /api/matches`. Posting a match computes the winner from `sets`, updates both players' ELO in a transaction (`BEGIN`/`COMMIT`/`ROLLBACK` via a checked-out client, not the pool directly), and returns both new ratings. A catch-all Express error handler returns JSON `{error}` on 500 instead of Express's default HTML stack-trace page. Postgres unique-violation (`code === '23505'`) is caught explicitly on player creation and returned as a 409, not a crash.
- Query placeholders are Postgres-style (`$1, $2, …`), not MySQL's `?` — this project switched from MySQL to Postgres early on; if you see `?` placeholders or `mysql2` anywhere, it's stale.
