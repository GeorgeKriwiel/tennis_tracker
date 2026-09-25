const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export interface ApiPlayer {
  id: number
  name: string
  elo: number
}

export interface ApiMatch {
  id: number
  played_on: string
  score_a: number
  score_b: number
  park: string | null
  notes: string | null
  // null when the match was a draw
  winner_id: number | null
  player_a_elo_after: number
  player_b_elo_after: number
  player_a_id: number
  player_a_name: string
  player_b_id: number
  player_b_name: string
}

async function request<T>(
  path: string,
  init?: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> },
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed with status ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// Removing a player and editing or deleting a logged match need the shared passcode.
const withPasscode = (passcode: string) => ({ 'x-admin-passcode': passcode })

export interface MatchPayload {
  playedOn: string
  playerAId: number
  playerBId: number
  scoreA: number
  scoreB: number
  park?: string
  notes?: string
}

export const api = {
  getPlayers: () => request<ApiPlayer[]>('/api/players'),

  createPlayer: (name: string) =>
    request<ApiPlayer>('/api/players', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  deletePlayer: (id: number, passcode: string) =>
    request<void>(`/api/players/${id}`, { method: 'DELETE', headers: withPasscode(passcode) }),

  getMatches: () => request<ApiMatch[]>('/api/matches'),

  createMatch: (payload: MatchPayload) =>
    request<unknown>('/api/matches', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteMatch: (id: number, passcode: string) =>
    request<void>(`/api/matches/${id}`, { method: 'DELETE', headers: withPasscode(passcode) }),

  updateMatch: (id: number, payload: MatchPayload, passcode: string) =>
    request<void>(`/api/matches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      headers: withPasscode(passcode),
    }),
}
