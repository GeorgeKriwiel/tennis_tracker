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

// Sets are capped both ways (±30%) — real sets cluster around 5-7 games so this
// rarely binds, it's mainly a guard against a mistyped score swinging K hugely.
// Tiebreaks keep the same upper guard (a freak long or mistyped score can't
// inflate K unboundedly), but have no floor: the math is naturally self-limiting
// on the low end anyway (a 1-point "win" only reaches ~x0.43, never near zero or
// negative), so a short, ordinary breaker should scale down for real rather than
// flatten out at some arbitrary minimum.
const MIN_SET_MULTIPLIER = 0.7
const MAX_MULTIPLIER = 1.3

export type MatchType = 'set' | 'tiebreak'

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
// Equal scores is a draw (base K) — only possible for a set; a tiebreak can
// never tie (enforced in matchInput.ts). Otherwise K is scaled by the winner's
// score, converted to game-equivalents for a tiebreak, relative to the 6-game
// standard. The margin below the loser's score is deliberately ignored.
export function scoreMatch(
  gamesA: number,
  gamesB: number,
  type: MatchType,
): { scoreA: 0 | 0.5 | 1; k: number } {
  if (gamesA === gamesB) return { scoreA: 0.5, k: BASE_K }

  const winnerRaw = Math.max(gamesA, gamesB)
  const winnerGames = type === 'tiebreak' ? winnerRaw / POINTS_PER_GAME : winnerRaw
  const rawMultiplier = 1 + K_CHANGE_PER_GAME * (winnerGames - STANDARD_GAMES)
  const multiplier =
    type === 'tiebreak'
      ? Math.min(MAX_MULTIPLIER, rawMultiplier)
      : Math.min(MAX_MULTIPLIER, Math.max(MIN_SET_MULTIPLIER, rawMultiplier))

  return { scoreA: gamesA > gamesB ? 1 : 0, k: BASE_K * multiplier }
}
