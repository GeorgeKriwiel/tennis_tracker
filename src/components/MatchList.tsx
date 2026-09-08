import type { ApiMatch } from '../lib/api'

export function MatchList({ matches }: { matches: ApiMatch[] }) {
  if (matches.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-neutral-500">
        No matches logged yet.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {matches.map((m) => {
        const aWon = m.winner_id === m.player_a_id
        return (
          <li
            key={m.id}
            className="rounded-lg bg-white p-3 shadow-sm dark:bg-neutral-800"
          >
            <div className="flex items-center justify-between text-sm">
              <span
                className={
                  aWon
                    ? 'font-semibold text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-500'
                }
              >
                {m.player_a_name}
              </span>
              <span className="text-xs text-neutral-400">vs</span>
              <span
                className={
                  !aWon
                    ? 'font-semibold text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-500'
                }
              >
                {m.player_b_name}
              </span>
            </div>
            <div className="mt-1 text-center text-xs text-neutral-500">
              {m.sets.map((s) => `${s.playerA}-${s.playerB}`).join(', ')}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
              <span>{m.played_on.slice(0, 10)}</span>
              <span>
                {m.player_a_elo_after} · {m.player_b_elo_after}
              </span>
            </div>
            {m.notes && (
              <div className="mt-1 text-xs text-neutral-400">{m.notes}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
