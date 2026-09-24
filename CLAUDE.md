# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This repo has two parts: a frontend (root) and a backend API (`server/`), deployed as separate services in the same Railway project but wired together at runtime — the frontend has no local persistence of its own, it's a thin client over the API's shared, ELO-rated leaderboard. Multiple people pointed at the same API/database see and add to the same players and matches.

## Deployment (Railway)

Everything lives in one Railway project (`tennis_tracker`, linked locally via `railway link`), as three services:

- **`Postgres`** — managed Postgres, public networking disabled by default. To connect from a laptop, use `railway connect Postgres --tunnel-only` (opens a local encrypted tunnel, prints a one-off `localhost` connection string+password) rather than enabling the database's public URL.
- **`tennis_tracker`** — the frontend. Auto-connected to the GitHub repo at the **root directory** (no override needed, since the frontend lives at repo root); Railway auto-detected it as a static Vite site and serves the `dist/` build via Caddy. **Was expected to auto-deploy on push to `main`, but a push on 2026-09-24 did NOT trigger a deployment** — after pushing frontend changes, verify with `railway deployment list --service tennis_tracker` and if nothing new started, deploy manually with `railway redeploy --service tennis_tracker --from-source --yes` (cause not yet investigated). Env var `VITE_API_URL` points at the `api` service's public domain — since Vite bakes `VITE_*` vars in at *build* time, changing this variable requires a rebuild, not just a restart: `railway redeploy --service tennis_tracker --from-source --yes` (plain `redeploy` without `--from-source` replays the old build artifact and won't pick up the new value).
- **`api`** — the backend (`server/`). Created as an empty service (`railway add --service api`) rather than connected to the GitHub repo, because this repo is a monorepo and connecting the whole repo would build the frontend's root `package.json` instead of `server/`'s. Deployed by running `railway up server --path-as-root --service api` from the repo root (plain `railway up` from inside `server/` still uploads the whole repo — `--path-as-root` is what scopes the build to that subdirectory). **Does not auto-deploy on push** — after backend changes, redeploy manually with that same command. Its `DATABASE_URL` is set to `${{Postgres.DATABASE_URL}}` (a Railway variable reference), which resolves to the *internal* `postgres.railway.internal` address — the deployed API talks to Postgres over Railway's private network, never the public internet.

Both `tennis_tracker` and `api` have public domains generated via `railway domain --service <name>` (`*.up.railway.app`). A custom domain (e.g. from Namecheap) would get pointed at the frontend's Railway domain via CNAME — not yet set up.

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
- **Derived stats**: `src/lib/records.ts`'s `computeStandings(players, matches)` builds each player's standing (W/L, win %, current streak, ELO change from their last match) by scanning the matches array, sorted by ELO — kept as a pure function rather than stored state so it can't drift from the source data. The last-match ELO delta is derived from consecutive `*_elo_after` values (baseline 1200), not stored.
- **Layout** (modelled on the Rankat app's league page; reference screenshots live in the gitignored `Inspiration/` folder — don't commit them, they're another app's artwork): a green gradient hero, a white rounded panel with a Standings/Matches segmented toggle, and a floating **+ Match** button (bottom-right) that opens the match form in a bottom `Sheet`. Adding a player is behind the "Add members" button (also a `Sheet`). No copyrighted Rankat art is used. Not built (no data model for them yet): seasons, multiple leagues/join codes, draws, tournaments.
- **Components** (`src/components/`): `Standings` (👑 for #1, 🔥/🗑️ streak badge at 3+ in a row, ▲/▼ last-match ELO change), `Sheet` (generic bottom sheet, closes on backdrop/Escape), `AddPlayerForm`, `MatchForm` (player-vs-player dropdowns + dynamic set rows; shows a placeholder when fewer than 2 players exist; defaults the dropdowns to the first two players by deriving from state during render rather than an effect), `MatchList` (bolds the winner, shows post-match ELO for both). All presentational; `App.tsx` owns data, the active tab, and which sheet is open, and closes the sheet after a successful submit.
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
