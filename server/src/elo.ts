const BASE_K = 30

// K scales with how many games the winner took: STANDARD_GAMES (a normal 6-game
// set) gets the full K, a set cut short at 5 counts a bit less, a 7-game set
// (7-5 / 7-6) a bit more.
const STANDARD_GAMES = 6
const K_CHANGE_PER_GAME = 0.1
const MIN_K_MULTIPLIER = 0.7
const MAX_K_MULTIPLIER = 1.3

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

// A match is a single set. Whoever won more games wins; equal games is a draw
// (base K, since there's no winning score to scale by). Otherwise K is scaled by
// the winner's games: 6 -> x1, 5 -> x0.9, 7 -> x1.1 (clamped). The margin
// (6-0 vs 6-4) is deliberately ignored.
export function scoreMatch(
  gamesA: number,
  gamesB: number,
): { scoreA: 0 | 0.5 | 1; k: number } {
  if (gamesA === gamesB) return { scoreA: 0.5, k: BASE_K }

  const winnerGames = Math.max(gamesA, gamesB)
  const multiplier = Math.min(
    MAX_K_MULTIPLIER,
    Math.max(MIN_K_MULTIPLIER, 1 + K_CHANGE_PER_GAME * (winnerGames - STANDARD_GAMES)),
  )
  return { scoreA: gamesA > gamesB ? 1 : 0, k: BASE_K * multiplier }
}
