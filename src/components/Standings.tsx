import type { Standing } from '../lib/records'

const STREAK_MIN = 3

export function Standings({ standings }: { standings: Standing[] }) {
  if (standings.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-neutral-500">
        No players yet — tap “Add members” to get started.
      </p>
    )
  }

  return (
    <ol className="flex flex-col">
      {standings.map(({ player, wins, losses, winPct, streak, lastDelta }, i) => (
        <li
          key={player.id}
          className="flex items-center gap-3 border-b border-neutral-100 py-4 last:border-0 dark:border-neutral-800"
        >
          <span className="w-8 shrink-0 text-center text-lg text-neutral-400">
            {i === 0 ? '👑' : `${i + 1}.`}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-lg font-medium text-neutral-900 dark:text-neutral-100">
                {player.name}
              </span>
              {streak && streak.count >= STREAK_MIN && (
                <span className="shrink-0 text-sm text-neutral-400">
                  {streak.kind === 'win' ? '🔥' : '🗑️'} ({streak.count})
                </span>
              )}
            </div>
            <div className="text-sm text-neutral-500">
              {wins}W / {losses}L · {winPct}%
            </div>
          </div>

          {lastDelta !== null && (
            <span
              className={`shrink-0 text-sm font-medium ${
                lastDelta >= 0 ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {Math.abs(lastDelta)} {lastDelta >= 0 ? '▲' : '▼'}
            </span>
          )}
          <span className="w-20 shrink-0 text-right text-neutral-500">
            {player.elo} ELO
          </span>
        </li>
      ))}
    </ol>
  )
}
