import type { PoolClient } from 'pg'
import { computeEloUpdate, scoreMatch } from './elo'

const STARTING_ELO = 1200

// Arbitrary app-wide key for pg_advisory_xact_lock — serializes every rating rebuild.
const RATINGS_LOCK_KEY = 815_2026

// ELO is a running total, so any added, edited or removed match can change every
// rating after it. Rebuild everything by replaying all matches in the order they were
// played (played_on, then id for same-day matches) from 1200. Ratings are kept exact
// (DOUBLE PRECISION); rounding is display-only, in the frontend.
//
// Must run inside the caller's transaction, after its own write. The advisory lock
// makes concurrent rebuilds take turns, and since it's taken before the SELECT below
// (READ COMMITTED gives each statement a fresh snapshot), a rebuild that waited sees
// the match the other transaction just committed — so two matches logged at the same
// moment can't overwrite each other's rating changes. Held until COMMIT/ROLLBACK.
export async function replayRatings(client: PoolClient) {
  await client.query('SELECT pg_advisory_xact_lock($1)', [RATINGS_LOCK_KEY])

  const { rows: matches } = await client.query<{
    id: number
    player_a_id: number
    player_b_id: number
    score_a: number
    score_b: number
    match_type: 'set' | 'tiebreak'
  }>(
    'SELECT id, player_a_id, player_b_id, score_a, score_b, match_type FROM matches ORDER BY played_on, id',
  )

  const ratings = new Map<number, number>()
  const matchIds: number[] = []
  const afterA: number[] = []
  const afterB: number[] = []

  for (const m of matches) {
    const a = ratings.get(m.player_a_id) ?? STARTING_ELO
    const b = ratings.get(m.player_b_id) ?? STARTING_ELO
    const { scoreA, k } = scoreMatch(m.score_a, m.score_b, m.match_type, a, b)
    const { newRatingA, newRatingB } = computeEloUpdate(a, b, scoreA, k)
    ratings.set(m.player_a_id, newRatingA)
    ratings.set(m.player_b_id, newRatingB)
    matchIds.push(m.id)
    afterA.push(newRatingA)
    afterB.push(newRatingB)
  }

  // Every create/edit/delete replays, so write in one statement per table rather than
  // one round-trip per row.
  await client.query(
    `UPDATE matches m SET player_a_elo_after = u.a, player_b_elo_after = u.b
     FROM unnest($1::int[], $2::float8[], $3::float8[]) AS u(id, a, b)
     WHERE m.id = u.id`,
    [matchIds, afterA, afterB],
  )
  await client.query(
    `UPDATE players p SET elo = COALESCE(u.elo, $3)
     FROM players p2 LEFT JOIN unnest($1::int[], $2::float8[]) AS u(id, elo) ON u.id = p2.id
     WHERE p.id = p2.id`,
    [[...ratings.keys()], [...ratings.values()], STARTING_ELO],
  )
}
