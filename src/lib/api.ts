const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export interface ApiPlayer {
  id: number
  name: string
  elo: number
}

export interface SetScore {
  playerA: number
  playerB: number
}

export interface ApiMatch {
  id: number
  played_on: string
  sets: SetScore[]
  notes: string | null
  winner_id: number
  player_a_elo_after: number
  player_b_elo_after: number
  player_a_id: number
  player_a_name: string
  player_b_id: number
  player_b_name: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed with status ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  getPlayers: () => request<ApiPlayer[]>('/api/players'),

  createPlayer: (name: string) =>
    request<ApiPlayer>('/api/players', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  deletePlayer: (id: number) =>
    request<void>(`/api/players/${id}`, { method: 'DELETE' }),

  getMatches: () => request<ApiMatch[]>('/api/matches'),

  createMatch: (payload: {
    playedOn: string
    playerAId: number
    playerBId: number
    sets: SetScore[]
    notes?: string
  }) =>
    request<unknown>('/api/matches', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
