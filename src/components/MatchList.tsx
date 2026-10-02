import type { ApiMatch } from '../lib/api'

export function MatchList({
  matches,
  onEdit,
  onSelectPlayer,
}: {
  matches: ApiMatch[]
  onEdit: (match: ApiMatch) => void
  onSelectPlayer: (playerId: number) => void
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
            {m.match_type === 'tiebreak' && (
              <span className="mb-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                Tiebreak
              </span>
            )}
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => onSelectPlayer(m.player_a_id)}
                className={
                  aWon || draw
                    ? 'font-semibold text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-500'
                }
              >
                {m.player_a_name}
              </button>
              <span className="text-xs text-neutral-400">{draw ? 'draw' : 'vs'}</span>
              <button
                onClick={() => onSelectPlayer(m.player_b_id)}
                className={
                  !aWon || draw
                    ? 'font-semibold text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-500'
                }
              >
                {m.player_b_name}
              </button>
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
                  className="text-court dark:text-ball"
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
