// Shared by creating and editing a match, so both apply exactly the same rules.

export interface MatchInput {
  playedOn: string
  playerAId: number
  playerBId: number
  gamesA: number
  gamesB: number
  park: string | null
  notes: string | null
}

type Parsed = { ok: true; value: MatchInput } | { ok: false; error: string }

const isWholeNumber = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0
const isId = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0

export function parseMatchInput(body: unknown): Parsed {
  const b = (body ?? {}) as Record<string, unknown>
  const { playedOn, playerAId, playerBId, scoreA, scoreB, park, notes } = b

  if (
    typeof playedOn !== 'string' ||
    !isId(playerAId) ||
    !isId(playerBId) ||
    !isWholeNumber(scoreA) ||
    !isWholeNumber(scoreB)
  ) {
    return {
      ok: false,
      error: 'playedOn, playerAId, playerBId, scoreA, scoreB (whole numbers >= 0) are required',
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(playedOn) || Number.isNaN(Date.parse(playedOn))) {
    return { ok: false, error: 'playedOn must be a date like 2026-09-24' }
  }
  if (scoreA === 0 && scoreB === 0) return { ok: false, error: 'enter a score' }
  if (playerAId === playerBId) return { ok: false, error: 'playerAId and playerBId must differ' }
  if (park !== undefined && park !== null && (typeof park !== 'string' || park.length > 100)) {
    return { ok: false, error: 'park must be a string of at most 100 characters' }
  }
  if (notes !== undefined && notes !== null && (typeof notes !== 'string' || notes.length > 500)) {
    return { ok: false, error: 'notes must be a string of at most 500 characters' }
  }

  return {
    ok: true,
    value: {
      playedOn,
      playerAId,
      playerBId,
      gamesA: scoreA,
      gamesB: scoreB,
      park: (park as string | null | undefined)?.trim() || null,
      notes: (notes as string | null | undefined) ?? null,
    },
  }
}

// result is scoreMatch's scoreA: 1 = A won, 0 = B won, 0.5 = draw (stored as NULL).
export function winnerOf(result: 0 | 0.5 | 1, playerAId: number, playerBId: number) {
  return result === 1 ? playerAId : result === 0 ? playerBId : null
}
