import { useEffect, useState } from 'react'
import { AddPlayerForm } from './components/AddPlayerForm'
import { Leaderboard } from './components/Leaderboard'
import { MatchForm } from './components/MatchForm'
import { MatchList } from './components/MatchList'
import { api, type ApiMatch, type ApiPlayer, type SetScore } from './lib/api'

function App() {
  const [players, setPlayers] = useState<ApiPlayer[]>([])
  const [matches, setMatches] = useState<ApiMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const [nextPlayers, nextMatches] = await Promise.all([
      api.getPlayers(),
      api.getMatches(),
    ])
    setPlayers(nextPlayers)
    setMatches(nextMatches)
  }

  useEffect(() => {
    refresh()
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load data'),
      )
      .finally(() => setLoading(false))
  }, [])

  async function handleAddPlayer(name: string) {
    await api.createPlayer(name)
    await refresh()
  }

  async function handleAddMatch(payload: {
    playedOn: string
    playerAId: number
    playerBId: number
    sets: SetScore[]
    notes?: string
  }) {
    await api.createMatch(payload)
    await refresh()
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col gap-4 bg-neutral-100 p-4 dark:bg-neutral-900">
      <h1 className="text-center text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        🎾 Tennis Tracker
      </h1>

      {error && (
        <p className="rounded-lg bg-red-100 p-3 text-center text-sm text-red-700 dark:bg-red-900 dark:text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-center text-sm text-neutral-500">Loading…</p>
      ) : (
        <>
          <Leaderboard players={players} matches={matches} />
          <AddPlayerForm onAdd={handleAddPlayer} />
          <MatchForm players={players} onAdd={handleAddMatch} />
          <MatchList matches={matches} />
        </>
      )}
    </div>
  )
}

export default App
