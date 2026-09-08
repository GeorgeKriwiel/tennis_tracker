const K_FACTOR = 32

export function computeEloUpdate(
  ratingA: number,
  ratingB: number,
  aWon: boolean,
) {
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400))
  const scoreA = aWon ? 1 : 0

  const newRatingA = Math.round(ratingA + K_FACTOR * (scoreA - expectedA))
  const newRatingB = Math.round(ratingB + K_FACTOR * (1 - scoreA - (1 - expectedA)))

  return { newRatingA, newRatingB }
}
