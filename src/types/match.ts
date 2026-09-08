export type MatchResult = 'win' | 'loss'

export interface SetScore {
  mine: number
  opponent: number
}

export interface Match {
  id: string
  date: string // YYYY-MM-DD
  opponent: string
  result: MatchResult
  sets: SetScore[]
  notes?: string
}
