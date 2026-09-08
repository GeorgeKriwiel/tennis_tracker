import type { ApiMatch } from './api'

export interface PlayerRecord {
  wins: number
  losses: number
}

export function computeRecord(matches: ApiMatch[], playerId: number): PlayerRecord {
  let wins = 0
  let losses = 0

  for (const m of matches) {
    if (m.player_a_id !== playerId && m.player_b_id !== playerId) continue
    if (m.winner_id === playerId) wins++
    else losses++
  }

  return { wins, losses }
}
