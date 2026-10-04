const BASE_K = 30

// A "standard" result needs no K adjustment; going short or long of it nudges K
// up or down, linearly. Sets are measured in games (standard = 6 games); a
// tiebreak's points are first converted to game-equivalents (roughly 4 points
// per game) and run through that same games-standard, rather than having its
// own separate scale — so a tiebreak only matches a full set's weight once its
// winner reaches 24 points (6 equivalent games).
const STANDARD_GAMES = 6
const K_CHANGE_PER_GAME = 0.1
const POINTS_PER_GAME = 4

// Capped on the high end only (+30%), so a freak long or mistyped score can't
// inflate K unboundedly (sets are also hard-capped at 8 games in matchInput.ts).
// Deliberately no floor, for sets or tiebreaks: K should keep shrinking game by
// game for a shorter result (a 1-1 draw weighs less than a 4-4 one) rather than
// flatten out at some arbitrary minimum. The math is self-limiting on the low
// end anyway — the higher score is always at least 1 (a set) or 1 point (a
// tiebreak), so the multiplier bottoms out around x0.43-x0.5, never near zero.
const MAX_MULTIPLIER = 1.3

export type MatchType = 'set' | 'tiebreak'

// scoreA is player A's actual score: 1 = A won, 0.5 = draw, 0 = A lost. The
// expected scores are standard Elo (400-point scale), so a draw still moves
// ratings toward each other when they differ. Not rounded: ratings are stored
// exact, so small changes accumulate instead of being rounded away each match.
export function computeEloUpdate(
  ratingA: number,
  ratingB: number,
  scoreA: 0 | 0.5 | 1,
  k = BASE_K,
) {
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400))
  const expectedB = 1 - expectedA

  return {
    newRatingA: ratingA + k * (scoreA - expectedA),
    newRatingB: ratingB + k * (1 - scoreA - expectedB),
  }
}

// A match is a single set or a single tiebreak. Whoever scored more wins;
// equal scores is a draw — only possible for a set; a tiebreak can never tie
// (enforced in matchInput.ts). Either way K is scaled by the higher score (the
// winner's, or the tied score on a draw), converted to game-equivalents for a
// tiebreak, relative to the 6-game standard — so an 8-8 draw weighs more than
// a 1-1 one, just as a 7-5 win weighs more than a 3-1 one. The margin below
// the loser's score is deliberately ignored.
export function scoreMatch(
  gamesA: number,
  gamesB: number,
  type: MatchType,
): { scoreA: 0 | 0.5 | 1; k: number } {
  const topRaw = Math.max(gamesA, gamesB)
  const topGames = type === 'tiebreak' ? topRaw / POINTS_PER_GAME : topRaw
  const multiplier = Math.min(
    MAX_MULTIPLIER,
    1 + K_CHANGE_PER_GAME * (topGames - STANDARD_GAMES),
  )

  const scoreA = gamesA === gamesB ? 0.5 : gamesA > gamesB ? 1 : 0
  return { scoreA, k: BASE_K * multiplier }
}
