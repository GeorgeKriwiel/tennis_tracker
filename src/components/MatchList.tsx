import type { ApiMatch } from '../lib/api'

export function MatchList({
  matches,
  onEdit,
}: {
  matches: ApiMatch[]
  onEdit: (match: ApiMatch) => void
}) {
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
        const draw = m.winner_id === null
        const aWon = m.winner_id === m.player_a_id
        return (
          <li
            key={m.id}
            className="rounded-lg bg-white p-3 shadow-sm dark:bg-neutral-800"
          >
            <div className="flex items-center justify-between text-sm">
              <span
                className={
                  aWon || draw
                    ? 'font-semibold text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-500'
                }
              >
                {m.player_a_name}
              </span>
              <span className="text-xs text-neutral-400">{draw ? 'draw' : 'vs'}</span>
              <span
                className={
                  !aWon || draw
                    ? 'font-semibold text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-500'
                }
              >
                {m.player_b_name}
              </span>
            </div>
            <div className="mt-1 text-center text-xs text-neutral-500">
              {m.score_a}-{m.score_b}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
              <span>
                {m.played_on.slice(0, 10)}
                {m.park && ` · ${m.park}`}
              </span>
              <span className="flex items-center gap-3">
                {m.player_a_elo_after} · {m.player_b_elo_after}
                <button
                  onClick={() => onEdit(m)}
                  className="text-blue-600 dark:text-blue-400"
                >
                  Edit
                </button>
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
