import { useMemo } from 'react'
import type { ApiMatch } from '../lib/api'
import { ratingsBefore } from '../lib/records'
import { MatchRow, type Side } from './MatchRow'

export function MatchList({
  matches,
  onEdit,
  onSelectPlayer,
}: {
  matches: ApiMatch[]
  onEdit: (match: ApiMatch) => void
  onSelectPlayer: (playerId: number) => void
}) {
  const before = useMemo(() => ratingsBefore(matches), [matches])

  if (matches.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-neutral-500">
        No matches logged yet.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {matches.map((m) => {
        const b = before.get(m.id)!
        const draw = m.winner_id === null
        const a: Side = {
          id: m.player_a_id,
          name: m.player_a_name,
          rating: b.a,
          score: m.score_a,
          delta: m.player_a_elo_after - b.a,
          bold: draw || m.winner_id === m.player_a_id,
        }
        const bSide: Side = {
          id: m.player_b_id,
          name: m.player_b_name,
          rating: b.b,
          score: m.score_b,
          delta: m.player_b_elo_after - b.b,
          bold: draw || m.winner_id === m.player_b_id,
        }
        // Winner on the left; a draw keeps the order it was logged in.
        const bWon = m.winner_id === m.player_b_id
        return (
          <MatchRow
            key={m.id}
            match={m}
            left={bWon ? bSide : a}
            right={bWon ? a : bSide}
            onSelectPlayer={onSelectPlayer}
            onEdit={() => onEdit(m)}
          />
        )
      })}
    </ul>
  )
}
