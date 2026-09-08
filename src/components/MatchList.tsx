import type { Match } from '../types/match'

export function MatchList({
  matches,
  onDelete,
}: {
  matches: Match[]
  onDelete: (id: string) => void
}) {
  if (matches.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-neutral-500">
        No matches logged yet.
      </p>
    )
  }

  const sorted = [...matches].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((m) => (
        <li
          key={m.id}
          className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm dark:bg-neutral-800"
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                className={
                  m.result === 'win'
                    ? 'rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300'
                }
              >
                {m.result === 'win' ? 'W' : 'L'}
              </span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                vs {m.opponent}
              </span>
            </div>
            <div className="text-xs text-neutral-500">
              {m.date} ·{' '}
              {m.sets.map((s) => `${s.mine}-${s.opponent}`).join(', ')}
            </div>
            {m.notes && (
              <div className="mt-1 text-xs text-neutral-400">{m.notes}</div>
            )}
          </div>
          <button
            onClick={() => onDelete(m.id)}
            className="text-xs text-neutral-400 active:text-red-500"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  )
}
