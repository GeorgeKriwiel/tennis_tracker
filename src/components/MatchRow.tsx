import type { ApiMatch } from '../lib/api'

export interface Side {
  id: number
  name: string
  // Rating going into the match
  rating: number
  score: number
  delta: number
  // The winner, or both players on a draw
  bold: boolean
}

// One match in chess.com's game-history style: both players stacked, each with their
// pre-match rating and score, then a date/type/park line. Shared by the Matches tab and
// player profiles so the two always look the same. With `aside` (a profile's result badge
// and rating change) the per-player rating changes are left out; without it, each line
// shows its own player's change.
export function MatchRow({
  match,
  top,
  bottom,
  selfId,
  aside,
  onSelectPlayer,
  onEdit,
}: {
  match: ApiMatch
  top: Side
  bottom: Side
  // The profile being viewed, whose name isn't a link
  selfId?: number
  aside?: React.ReactNode
  onSelectPlayer: (playerId: number) => void
  onEdit?: () => void
}) {
  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <div
          className={`grid min-w-0 flex-1 items-center gap-x-3 gap-y-0.5 ${
            aside ? 'grid-cols-[minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)_auto_2.25rem]'
          }`}
        >
          {[top, bottom].map((side) => (
            <Line
              key={side.id}
              side={side}
              showDelta={!aside}
              onClick={side.id === selfId ? undefined : () => onSelectPlayer(side.id)}
            />
          ))}
        </div>
        {aside}
      </div>
      <div className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
        <span className="shrink-0">{match.played_on.slice(0, 10)}</span>
        <span aria-hidden>·</span>
        {/* Sets are the norm, so plain text; the rarer tiebreak gets a tag that stands out */}
        {match.match_type === 'tiebreak' ? (
          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:bg-amber-900 dark:text-amber-300">
            Tiebreak
          </span>
        ) : (
          <span className="shrink-0">Set</span>
        )}
        {match.park && (
          <>
            <span aria-hidden>·</span>
            <span className="min-w-0 truncate">{match.park}</span>
          </>
        )}
        {onEdit && (
          <button onClick={onEdit} className="ml-auto shrink-0 pl-2 text-court dark:text-ball">
            Edit
          </button>
        )}
      </div>
      {match.notes && <div className="mt-0.5 text-xs text-neutral-400">{match.notes}</div>}
    </li>
  )
}

export function Delta({ value }: { value: number }) {
  return (
    <span
      className={`text-right text-sm font-medium tabular-nums ${
        value >= 0 ? 'text-green-600' : 'text-red-500'
      }`}
    >
      {value >= 0 ? '+' : '−'}
      {Math.abs(value)}
    </span>
  )
}

function Line({
  side,
  showDelta,
  onClick,
}: {
  side: Side
  showDelta: boolean
  onClick?: () => void
}) {
  const nameClass = `truncate ${
    side.bold
      ? 'font-semibold text-neutral-900 dark:text-neutral-100'
      : 'text-neutral-600 dark:text-neutral-300'
  }`
  return (
    <>
      <div className="flex min-w-0 items-baseline gap-1.5">
        {onClick ? (
          <button onClick={onClick} className={`${nameClass} underline-offset-2 hover:underline`}>
            {side.name}
          </button>
        ) : (
          <span className={nameClass}>{side.name}</span>
        )}
        <span className="shrink-0 text-sm text-neutral-400 tabular-nums">({side.rating})</span>
      </div>
      <span
        className={`text-right text-lg leading-tight tabular-nums ${
          side.bold ? 'font-semibold text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'
        }`}
      >
        {side.score}
      </span>
      {showDelta && <Delta value={side.delta} />}
    </>
  )
}
