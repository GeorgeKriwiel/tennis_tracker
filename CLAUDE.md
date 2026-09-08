# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server (default port 5173)
- `npm run build` — typecheck (`tsc -b`) then production build to `dist/`
- `npm run lint` — run oxlint over the codebase
- `npm run preview` — serve the production build locally

There is no test runner configured yet. This project has no backend — it's a static single-page app.

## Architecture

Mobile-first single-page React app (Vite + React 19 + TypeScript). No backend, no database — all data lives in the browser via `localStorage`.

- **State & persistence**: `src/hooks/useLocalStorage.ts` is a generic `useState` + `localStorage` sync hook. `App.tsx` is the single source of truth for match data (`useLocalStorage<Match[]>('tennis-matches', [])`) and passes `matches`/mutator callbacks down as props — there is no global store or context.
- **Domain model**: `src/types/match.ts` defines `Match` (id, date, opponent, result, sets, notes). A match can have multiple `SetScore` entries (mine/opponent games per set).
- **Derived stats**: `src/lib/stats.ts` computes win/loss/win-rate from the matches array on every render — kept as a pure function rather than stored state, so it never drifts from the source data.
- **Components** (`src/components/`): `MatchForm` (controlled form with dynamic set rows), `MatchList` (sorted newest-first, delete-in-place), `StatsSummary` (summary tiles). Each is presentational and receives data/callbacks from `App.tsx` — no component reads or writes `localStorage` directly.
- **Styling**: Tailwind CSS v4 via the `@tailwindcss/vite` plugin (not the old PostCSS/config-file setup — there is no `tailwind.config.js`). Global styles/import live in `src/index.css`. Layout is constrained to `max-w-md` and built mobile-first since the app is meant to be used courtside on a phone; dark mode is handled via Tailwind `dark:` classes.

## Conventions

- IDs are generated with `crypto.randomUUID()`, dates stored as `YYYY-MM-DD` strings (from `<input type="date">`).
- Keep persistence logic inside `useLocalStorage`/`App.tsx` — don't reach into `localStorage` from leaf components.
