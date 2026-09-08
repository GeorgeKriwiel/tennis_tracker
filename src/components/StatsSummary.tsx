import { computeStats } from '../lib/stats'
import type { Match } from '../types/match'

export function StatsSummary({ matches }: { matches: Match[] }) {
  const { total, wins, losses, winRate } = computeStats(matches)

  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      <Stat label="Matches" value={total} />
      <Stat label="Wins" value={wins} />
      <Stat label="Losses" value={losses} />
      <Stat label="Win %" value={`${winRate}%`} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-neutral-800">
      <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
      <div className="text-xs text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
    </div>
  )
}
