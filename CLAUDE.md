# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This repo has two parts: a frontend (root) and a backend API (`server/`), deployed independently (e.g. Vercel for the frontend, Railway for the API + Postgres) but wired together at runtime — the frontend has no local persistence of its own, it's a thin client over the API's shared, ELO-rated leaderboard. Multiple people pointed at the same API/database see and add to the same players and matches.

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

Vite + React 19 + TypeScript. Talks to the backend over HTTP; holds no data of its own beyond in-flight component state.

- **`src/lib/api.ts`**: the only place that knows the API's base URL (`VITE_API_URL`, defaulting to `http://localhost:3001` for local dev) and endpoint shapes. `request()` throws on non-2xx responses using the API's `{error}` JSON body, so callers can just `try/catch`.
- **State**: `App.tsx` is the single source of truth — it holds `players` and `matches` in state, fetches both on mount, and calls `api.createPlayer`/`api.createMatch` then **refetches both lists** on any mutation (rather than optimistically patching local state), so the UI always reflects what the server actually persisted. No global store or context.
- **Domain model**: matches are between two registered players (`playerAId`/`playerBId`), not a free-text opponent — this mirrors the backend's model exactly (see below), there's no separate frontend-only `Match` type anymore.
- **Derived stats**: `src/lib/records.ts`'s `computeRecord(matches, playerId)` derives a player's win/loss record by scanning the matches array — kept as a pure function rather than stored state so it can't drift from the source data.
- **Components** (`src/components/`): `Leaderboard` (players ranked by ELO, W/L computed via `records.ts`), `AddPlayerForm`, `MatchForm` (player-vs-player dropdowns + dynamic set rows; renders a placeholder instead of the form when fewer than 2 players exist; defaults the two dropdowns to the first two players by deriving from state during render rather than syncing via an effect), `MatchList` (bolds the winner, shows post-match ELO for both players). All are presentational, receiving data/callbacks from `App.tsx`.
- **Styling**: Tailwind CSS v4 via the `@tailwindcss/vite` plugin (not the old PostCSS/config-file setup — there is no `tailwind.config.js`). Global styles/import live in `src/index.css`. Layout is constrained to `max-w-md` and built mobile-first since the app is meant to be used courtside on a phone; dark mode is handled via Tailwind `dark:` classes.
- Dates are stored/sent as `YYYY-MM-DD` strings (from `<input type="date">`); when displaying a date that came back from the API, use `.slice(0, 10)` rather than `new Date(...).toLocaleDateString()` — the API returns a UTC-midnight timestamp for `DATE` columns, and `toLocaleDateString()` can roll it back a day depending on the viewer's timezone.

### Backend (`server/`) — Express + Postgres API

Supports multiple people logging matches against a shared, ELO-rated leaderboard. Deployed independently of the frontend (e.g. Railway for the API + Postgres, Vercel for the static frontend) — locally they run as separate dev servers (frontend on 5173, API on 3001), connected only by `VITE_API_URL`.

- **`src/db.ts`**: a `pg` `Pool`, configured from `DATABASE_URL` if set, else discrete `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` vars.
- **`src/schema.sql`**: two tables — `players` (name, `elo`, starts at 1200) and `matches` (two player FKs, `sets` as `JSONB`, `winner_id`, each player's post-match ELO). Applied via `npm run migrate` (`src/migrate.ts`), not a migration framework — schema changes mean editing `schema.sql` (idempotent `CREATE TABLE IF NOT EXISTS`) and re-running migrate.
- **`src/elo.ts`**: pure function `computeEloUpdate(ratingA, ratingB, aWon)`, standard ELO with K-factor 32. No I/O — safe to unit test directly.
- **`src/index.ts`**: routes for `GET/POST /api/players` and `GET/POST /api/matches`. Posting a match computes the winner from `sets` server-side (the frontend never sends a "who won" flag), updates both players' ELO in a transaction (`BEGIN`/`COMMIT`/`ROLLBACK` via a checked-out client, not the pool directly), and returns both new ratings — note this POST response is camelCase and shaped differently from the GET list's snake_case rows; the frontend doesn't rely on the POST body, it always refetches. A catch-all Express error handler returns JSON `{error}` on 500 instead of Express's default HTML stack-trace page. Postgres unique-violation (`code === '23505'`) is caught explicitly on player creation and returned as a 409, not a crash.
- Query placeholders are Postgres-style (`$1, $2, …`), not MySQL's `?` — this project switched from MySQL to Postgres early on; if you see `?` placeholders or `mysql2` anywhere, it's stale.
- **No DELETE endpoints exist yet** (for players or matches) — deleting a match can't just remove the row, since ELO is a running total and later matches were computed on top of it. If asked to add delete/edit, that means recomputing ELO forward from the edited point, not just an SQL delete.
- CORS is wide open (`cors()` with no options) since this is a small personal-project API with no auth yet — fine for now, worth tightening if this ever handles real user data beyond a friend group.
