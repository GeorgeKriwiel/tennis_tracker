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

// Margin of victory scales K too (the FiveThirtyEight NFL/NBA Elo approach), but
// never the result itself: a win is still 1, a loss 0, a draw 0.5, so winning
// always gains rating and losing always costs it — margin only changes by how
// much. A 2-game/2-point margin is standard (×1, the normal win-by-2) for both
// types. Each game beyond it adds 10% for a set; each point adds 5% for a
// tiebreak (points are smaller units, so 7-0 lands near a 6-0 set, not past it —
// deliberately not the ÷4 game-equivalent used for length, which would make a
// 7-0 breaker count as a *close* result). Capped at the same ×1.3; a 1-margin
// squeaker (7-6) gets a little less than standard. Draws have no margin (×1).
const STANDARD_MARGIN = 2
const SET_K_CHANGE_PER_MARGIN_GAME = 0.1
const TIEBREAK_K_CHANGE_PER_MARGIN_POINT = 0.05

// Favourites win by bigger margins, so on its own the margin multiplier hands them
// free rating over time (stretching the ladder ~5% beyond true skill in simulation).
// To keep every pairing break-even on average — so nobody gains by seeking out or
// avoiding weaker/stronger opponents — K is scaled by c / (gap × 0.001 + c), where
// gap is the winner's pre-match rating minus the loser's: slightly less when the
// favourite wins, slightly more for an upset (about ∓2% at a 200-point gap). The
// form is FiveThirtyEight's margin-autocorrelation fix; their NFL constant (2.2)
// over-corrected badly here (ratings ~10% *compressed*, short-changing favourites),
// so c was tuned by simulating sets (6-game, win by 2, 7-6 tiebreak) between players
// of known skill until the rating spread matched plain Elo. Draws: no correction.
const FAVOURITE_CORRECTION = 8.8

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
// a 1-1 one, just as a 7-5 win weighs more than a 3-1 one. A win's margin then
// scales K again (see STANDARD_MARGIN), so a 6-0 moves ratings more than a 6-4,
// and a 6-4 more than a 7-6 would at the same length. The two multipliers combine,
// e.g. 6-0 = ×1.0 length × ×1.3 margin = K 39 between equal ratings. Finally, the
// favourite correction (FAVOURITE_CORRECTION) needs the pre-match ratings.
export function matchResult(gamesA: number, gamesB: number): 0 | 0.5 | 1 {
  return gamesA === gamesB ? 0.5 : gamesA > gamesB ? 1 : 0
}

export function scoreMatch(
  gamesA: number,
  gamesB: number,
  type: MatchType,
  ratingA: number,
  ratingB: number,
): { scoreA: 0 | 0.5 | 1; k: number } {
  const topRaw = Math.max(gamesA, gamesB)
  const topGames = type === 'tiebreak' ? topRaw / POINTS_PER_GAME : topRaw
  const lengthMultiplier = Math.min(
    MAX_MULTIPLIER,
    1 + K_CHANGE_PER_GAME * (topGames - STANDARD_GAMES),
  )

  const margin = Math.abs(gamesA - gamesB)
  const perMargin =
    type === 'tiebreak' ? TIEBREAK_K_CHANGE_PER_MARGIN_POINT : SET_K_CHANGE_PER_MARGIN_GAME
  const marginMultiplier =
    margin === 0 ? 1 : Math.min(MAX_MULTIPLIER, 1 + perMargin * (margin - STANDARD_MARGIN))

  const scoreA = matchResult(gamesA, gamesB)
  const winnerGap = scoreA === 1 ? ratingA - ratingB : ratingB - ratingA
  const favouriteCorrection =
    scoreA === 0.5 ? 1 : FAVOURITE_CORRECTION / (winnerGap * 0.001 + FAVOURITE_CORRECTION)

  return { scoreA, k: BASE_K * lengthMultiplier * marginMultiplier * favouriteCorrection }
}
