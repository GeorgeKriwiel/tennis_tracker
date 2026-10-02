import type { ApiMatch } from '../lib/api'
import { computeProfile, type Result, type Standing } from '../lib/records'
import { Delta, StackedMatchRow } from './MatchRow'
import { RatingChart } from './RatingChart'

const RESULT_STYLE: Record<Result, { sign: string; className: string; label: string }> = {
  win: { sign: '+', className: 'bg-green-600 text-white', label: 'Won' },
  draw: { sign: '=', className: 'bg-neutral-400 text-white', label: 'Drew' },
  loss: { sign: '−', className: 'bg-red-500 text-white', label: 'Lost' },
}

export function PlayerProfile({
  standing,
  matches,
  onSelectPlayer,
}: {
  standing: Standing
  matches: ApiMatch[]
  onSelectPlayer: (id: number) => void
}) {
  const { player, wins, draws, losses } = standing
  const profile = computeProfile(player.id, matches)
  const total = profile.history.length

  if (total === 0) {
    return (
      <p className="py-10 text-center text-sm text-neutral-500">
        {player.name} hasn’t played a match yet.
      </p>
    )
  }

  const pct = (n: number) => `${Math.round((n / total) * 100)}%`

  return (
    <div className="flex flex-col gap-6">
      <section>
        <RatingChart points={profile.ratingPoints} />
      </section>

      <section className="grid grid-cols-4 divide-x divide-neutral-100 rounded-2xl bg-neutral-50 py-3 text-center dark:divide-neutral-800 dark:bg-neutral-800/50">
        <Tile label="Matches" value={total} />
        <Tile label="Wins" value={wins} sub={pct(wins)} dot="bg-green-600" />
        <Tile label="Draws" value={draws} sub={pct(draws)} dot="bg-neutral-400" />
        <Tile label="Losses" value={losses} sub={pct(losses)} dot="bg-red-500" />
      </section>

      <section>
        <h3 className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Highlights
        </h3>
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          <Highlight
            icon="⬆️"
            label="Highest rating"
            detail={profile.highest.date ?? 'starting rating'}
            value={profile.highest.elo}
          />
          <Highlight
            icon="🏅"
            label="Best win"
            detail={profile.bestWin?.opponentName}
            value={profile.bestWin?.elo ?? '–'}
          />
          <Highlight icon="🔥" label="Best win streak" value={profile.bestWinStreak} />
        </ul>
      </section>

      <section>
        <h3 className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Match history
        </h3>
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {profile.history.map((p) => {
            const style = RESULT_STYLE[p.result]
            return (
              <StackedMatchRow
                key={p.match.id}
                match={p.match}
                selfId={player.id}
                top={{
                  id: player.id,
                  name: player.name,
                  rating: p.myBefore,
                  score: p.myScore,
                  delta: p.delta,
                  bold: p.result !== 'loss',
                }}
                bottom={{
                  id: p.opponentId,
                  name: p.opponentName,
                  rating: p.oppBefore,
                  score: p.oppScore,
                  delta: p.oppDelta,
                  bold: p.result !== 'win',
                }}
                onSelectPlayer={onSelectPlayer}
                aside={
                  <>
                    <span
                      aria-label={style.label}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sm font-bold ${style.className}`}
                    >
                      {style.sign}
                    </span>
                    <span className="w-9 shrink-0 text-right text-sm tabular-nums">
                      <Delta value={p.delta} />
                    </span>
                  </>
                }
              />
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function Tile({
  label,
  value,
  sub,
  dot,
}: {
  label: string
  value: number
  sub?: string
  dot?: string
}) {
  return (
    <div className="px-1">
      <div className="flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {dot && <span className={`h-2 w-2 rounded-sm ${dot}`} />}
        {label}
      </div>
      <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{value}</div>
      <div className="h-4 text-xs text-neutral-400">{sub}</div>
    </div>
  )
}

function Highlight({
  icon,
  label,
  detail,
  value,
}: {
  icon: string
  label: string
  detail?: string
  value: number | string
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="w-6 text-center">{icon}</span>
      <span className="font-medium text-neutral-900 dark:text-neutral-100">{label}</span>
      {detail && <span className="truncate text-sm text-neutral-500">{detail}</span>}
      <span className="ml-auto shrink-0 font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {value}
      </span>
    </li>
  )
}
