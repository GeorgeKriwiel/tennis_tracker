import type { ApiMatch, ApiPlayer } from './api'

export interface Standing {
  player: ApiPlayer
  wins: number
  losses: number
  winPct: number
  streak: { kind: 'win' | 'loss'; count: number } | null
  // ELO change from the player's most recent match, null if they haven't played
  lastDelta: number | null
}

const STARTING_ELO = 1200

function eloAfter(match: ApiMatch, playerId: number) {
  return match.player_a_id === playerId
    ? match.player_a_elo_after
    : match.player_b_elo_after
}

export function computeStandings(
  players: ApiPlayer[],
  matches: ApiMatch[],
): Standing[] {
  const newestFirst = [...matches].sort(
    (a, b) => b.played_on.localeCompare(a.played_on) || b.id - a.id,
  )

  return players
    .map((player) => {
      const mine = newestFirst.filter(
        (m) => m.player_a_id === player.id || m.player_b_id === player.id,
      )
      const results = mine.map((m) =>
        m.winner_id === player.id ? ('win' as const) : ('loss' as const),
      )

      const wins = results.filter((r) => r === 'win').length
      const losses = results.length - wins
      const winPct = results.length === 0 ? 0 : Math.round((wins / results.length) * 100)

      let streak: Standing['streak'] = null
      if (results.length > 0) {
        const kind = results[0]
        let count = 0
        while (count < results.length && results[count] === kind) count++
        streak = { kind, count }
      }

      const lastDelta =
        mine.length === 0
          ? null
          : eloAfter(mine[0], player.id) -
            (mine[1] ? eloAfter(mine[1], player.id) : STARTING_ELO)

      return { player, wins, losses, winPct, streak, lastDelta }
    })
    .sort((a, b) => b.player.elo - a.player.elo)
}
