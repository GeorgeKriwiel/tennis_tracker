const BASE_K = 30

// A "standard" result needs no K adjustment; going short or long of it nudges K
// up or down, linearly, clamped to +/-30%. Sets are measured in games (standard
// = 6 games), tiebreaks in points (standard = 7 points). The per-unit nudge for
// points is a set's per-game nudge divided by ~4, since a game is roughly 4
// points, so a similarly "long" result gets a similarly sized K change either way.
const MIN_K_MULTIPLIER = 0.7
const MAX_K_MULTIPLIER = 1.3

export type MatchType = 'set' | 'tiebreak'

const STANDARD_SCORE: Record<MatchType, number> = { set: 6, tiebreak: 7 }
const UNIT_CHANGE: Record<MatchType, number> = { set: 0.1, tiebreak: 0.025 }

// scoreA is player A's actual score: 1 = A won, 0.5 = draw, 0 = A lost. The
// expected scores are standard Elo (400-point scale), so a draw still moves
// ratings toward each other when they differ.
export function computeEloUpdate(
  ratingA: number,
  ratingB: number,
  scoreA: 0 | 0.5 | 1,
  k = BASE_K,
) {
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400))
  const expectedB = 1 - expectedA

  return {
    newRatingA: Math.round(ratingA + k * (scoreA - expectedA)),
    newRatingB: Math.round(ratingB + k * (1 - scoreA - expectedB)),
  }
}

// A match is a single set or a single tiebreak. Whoever scored more wins.
// Equal scores is a draw (base K, since there's no winning score to scale by) —
// only possible for a set; a tiebreak can never tie (enforced in matchInput.ts).
// Otherwise K is scaled by the winner's score relative to that type's standard
// (set: 6 games x1, 5 x0.9, 7 x1.1; tiebreak: 7 points x1, 11 points x1.1),
// clamped. The margin below the loser's score (6-0 vs 6-4, 11-9 vs 11-2) is
// deliberately ignored.
export function scoreMatch(
  gamesA: number,
  gamesB: number,
  type: MatchType,
): { scoreA: 0 | 0.5 | 1; k: number } {
  if (gamesA === gamesB) return { scoreA: 0.5, k: BASE_K }

  const winnerScore = Math.max(gamesA, gamesB)
  const multiplier = Math.min(
    MAX_K_MULTIPLIER,
    Math.max(
      MIN_K_MULTIPLIER,
      1 + UNIT_CHANGE[type] * (winnerScore - STANDARD_SCORE[type]),
    ),
  )
  return { scoreA: gamesA > gamesB ? 1 : 0, k: BASE_K * multiplier }
}
