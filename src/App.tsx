import { useEffect, useMemo, useState } from 'react'
import { MatchForm } from './components/MatchForm'
import { MatchList } from './components/MatchList'
import { MembersPanel } from './components/MembersPanel'
import { Sheet } from './components/Sheet'
import { Standings } from './components/Standings'
import { api, type ApiMatch, type ApiPlayer, type SetScore } from './lib/api'
import { computeStandings } from './lib/records'

const LEAGUE_NAME = 'Tennis Tracker'

type Tab = 'standings' | 'matches'
type OpenSheet = 'match' | 'player' | null

function App() {
  const [players, setPlayers] = useState<ApiPlayer[]>([])
  const [matches, setMatches] = useState<ApiMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('standings')
  const [sheet, setSheet] = useState<OpenSheet>(null)

  const standings = useMemo(
    () => computeStandings(players, matches),
    [players, matches],
  )

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

  async function handleDeletePlayer(id: number) {
    await api.deletePlayer(id)
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
    setSheet(null)
    setTab('standings')
  }

  return (
    <div className="mx-auto min-h-svh max-w-md bg-emerald-950">
      <header className="flex h-52 flex-col items-center justify-center bg-gradient-to-b from-emerald-600 to-emerald-950 px-6 pb-8 text-center text-white">
        <div className="text-5xl">🎾</div>
        <h1 className="mt-2 text-2xl font-bold">{LEAGUE_NAME}</h1>
        <p className="text-sm text-emerald-100/70">
          {players.length} {players.length === 1 ? 'player' : 'players'}
        </p>
      </header>

      <main className="-mt-6 min-h-[calc(100svh-10rem)] rounded-t-[2rem] bg-white px-4 pt-5 pb-32 dark:bg-neutral-900">
        <div className="mb-3 grid grid-cols-2 rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
          {(['standings', 'matches'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full py-2.5 text-sm font-medium capitalize ${
                tab === t
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100'
                  : 'text-neutral-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-red-100 p-3 text-center text-sm text-red-700 dark:bg-red-900 dark:text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-10 text-center text-sm text-neutral-500">Loading…</p>
        ) : tab === 'standings' ? (
          <>
            <Standings standings={standings} />
            <button
              onClick={() => setSheet('player')}
              className="mt-4 w-full rounded-full border border-neutral-200 py-3 text-sm font-medium text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
            >
              Manage members
            </button>
          </>
        ) : (
          <MatchList matches={matches} />
        )}
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 mx-auto flex max-w-md justify-end px-6">
        <button
          onClick={() => setSheet('match')}
          className="pointer-events-auto rounded-full bg-neutral-900 px-6 py-4 text-base font-medium text-white shadow-lg active:bg-black"
        >
          + Match
        </button>
      </div>

      <Sheet open={sheet === 'match'} title="Log a match" onClose={() => setSheet(null)}>
        <MatchForm players={players} onAdd={handleAddMatch} />
      </Sheet>
      <Sheet open={sheet === 'player'} title="Members" onClose={() => setSheet(null)}>
        <MembersPanel
          players={players}
          onAdd={handleAddPlayer}
          onDelete={handleDeletePlayer}
        />
      </Sheet>
    </div>
  )
}

export default App
