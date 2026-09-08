import type { Match } from '../types/match'

export function computeStats(matches: Match[]) {
  const total = matches.length
  const wins = matches.filter((m) => m.result === 'win').length
  const losses = total - wins
  const winRate = total === 0 ? 0 : Math.round((wins / total) * 100)

  return { total, wins, losses, winRate }
}
