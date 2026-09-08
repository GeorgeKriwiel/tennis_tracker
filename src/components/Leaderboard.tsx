import type { ApiMatch, ApiPlayer } from '../lib/api'
import { computeRecord } from '../lib/records'

export function Leaderboard({
  players,
  matches,
}: {
  players: ApiPlayer[]
  matches: ApiMatch[]
}) {
  if (players.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-neutral-500">
        No players yet — add one below.
      </p>
    )
  }

  const ranked = [...players].sort((a, b) => b.elo - a.elo)

  return (
    <ol className="flex flex-col gap-2">
      {ranked.map((player, i) => {
        const { wins, losses } = computeRecord(matches, player.id)
        return (
          <li
            key={player.id}
            className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm dark:bg-neutral-800"
          >
            <div className="flex items-center gap-3">
              <span className="w-5 text-sm font-medium text-neutral-400">
                {i + 1}
              </span>
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">
                  {player.name}
                </div>
                <div className="text-xs text-neutral-500">
                  {wins}W / {losses}L
                </div>
              </div>
            </div>
            <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {player.elo}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
