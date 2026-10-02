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

// One match as a scoreboard: winner (or, on a profile, that player) on the left, the score
// in the middle as the one big number, and each player's pre-match rating and ELO change
// small under their name. Then a date/type/park line. Shared by the Matches tab and player
// profiles so the two always look the same.
export function MatchRow({
  match,
  left,
  right,
  selfId,
  onSelectPlayer,
  onEdit,
}: {
  match: ApiMatch
  left: Side
  right: Side
  // The profile being viewed, whose name isn't a link
  selfId?: number
  onSelectPlayer: (playerId: number) => void
  onEdit?: () => void
}) {
  const link = (side: Side) => (side.id === selfId ? undefined : () => onSelectPlayer(side.id))
  return (
    <li className="py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <Player side={left} align="left" onClick={link(left)} />
        <div className="text-xl whitespace-nowrap tabular-nums">
          <span className={scoreClass(left.bold)}>{left.score}</span>
          <span className="text-neutral-400"> – </span>
          <span className={scoreClass(right.bold)}>{right.score}</span>
        </div>
        <Player side={right} align="right" onClick={link(right)} />
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
          // Quiet on purpose: editing is a rare, passcode-gated fix. Padding gives a ~32px tap
          // target; the negative margin keeps it from making the row taller.
          <button
            onClick={onEdit}
            aria-label="Edit match"
            title="Edit match"
            className="-my-2 -mr-2 ml-auto shrink-0 rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
              <path d="M13.5 3.5l3 3L7 16H4v-3z" />
              <path d="M11.5 5.5l3 3" />
            </svg>
          </button>
        )}
      </div>
      {match.notes && <div className="mt-0.5 text-xs text-neutral-400">{match.notes}</div>}
    </li>
  )
}

function scoreClass(bold: boolean) {
  return bold ? 'font-semibold text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'
}

function Delta({ value }: { value: number }) {
  return (
    <span className={`font-medium ${value >= 0 ? 'text-green-600' : 'text-red-500'}`}>
      {value >= 0 ? '+' : '−'}
      {Math.abs(value)}
    </span>
  )
}

function Player({
  side,
  align,
  onClick,
}: {
  side: Side
  align: 'left' | 'right'
  onClick?: () => void
}) {
  const nameClass = `block max-w-full truncate ${align === 'right' ? 'ml-auto' : ''} ${
    side.bold
      ? 'font-semibold text-neutral-900 dark:text-neutral-100'
      : 'text-neutral-600 dark:text-neutral-300'
  }`
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
      {onClick ? (
        <button onClick={onClick} className={`${nameClass} underline-offset-2 hover:underline`}>
          {side.name}
        </button>
      ) : (
        <span className={nameClass}>{side.name}</span>
      )}
      <div className="text-xs tabular-nums">
        <span className="text-neutral-400">{side.rating}</span> <Delta value={side.delta} />
      </div>
    </div>
  )
}
