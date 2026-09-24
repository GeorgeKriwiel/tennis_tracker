import type { PoolClient } from 'pg'
import { computeEloUpdate, scoreMatch } from './elo'

const STARTING_ELO = 1200

// ELO is a running total, so removing a match invalidates every rating computed
// after it. Rebuild everything by replaying the remaining matches in the order
// they were logged (id order, which is the order the ratings were originally
// applied in). Must run inside the caller's transaction.
export async function replayRatings(client: PoolClient) {
  const { rows: matches } = await client.query<{
    id: number
    player_a_id: number
    player_b_id: number
    score_a: number
    score_b: number
  }>('SELECT id, player_a_id, player_b_id, score_a, score_b FROM matches ORDER BY id')

  const ratings = new Map<number, number>()

  for (const m of matches) {
    const a = ratings.get(m.player_a_id) ?? STARTING_ELO
    const b = ratings.get(m.player_b_id) ?? STARTING_ELO
    const { scoreA, k } = scoreMatch(m.score_a, m.score_b)
    const { newRatingA, newRatingB } = computeEloUpdate(a, b, scoreA, k)
    ratings.set(m.player_a_id, newRatingA)
    ratings.set(m.player_b_id, newRatingB)
    await client.query(
      'UPDATE matches SET player_a_elo_after = $1, player_b_elo_after = $2 WHERE id = $3',
      [newRatingA, newRatingB, m.id],
    )
  }

  await client.query('UPDATE players SET elo = $1', [STARTING_ELO])
  for (const [playerId, elo] of ratings) {
    await client.query('UPDATE players SET elo = $1 WHERE id = $2', [elo, playerId])
  }
}
