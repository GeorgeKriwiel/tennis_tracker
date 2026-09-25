import { useEffect, useMemo, useState } from 'react'
import { BottomNav, type Page } from './components/BottomNav'
import { CourtsTable } from './components/CourtsTable'
import { MatchForm } from './components/MatchForm'
import { MatchList } from './components/MatchList'
import { MembersPanel } from './components/MembersPanel'
import { Sheet } from './components/Sheet'
import { Standings } from './components/Standings'
import { api, type ApiMatch, type ApiPlayer, type MatchPayload } from './lib/api'
import { PARKS } from './data/courts'
import { computeStandings } from './lib/records'

const LEAGUE_NAME = 'Tennis Tracker'
const TOTAL_COURTS = PARKS.reduce((sum, p) => sum + p.courts, 0)

type Tab = 'standings' | 'matches'
type OpenSheet = 'match' | 'player' | null

function App() {
  const [players, setPlayers] = useState<ApiPlayer[]>([])
  const [matches, setMatches] = useState<ApiMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState<Page>('league')
  const [tab, setTab] = useState<Tab>('standings')
  const [sheet, setSheet] = useState<OpenSheet>(null)
  const [editing, setEditing] = useState<ApiMatch | null>(null)
  // The shared passcode for removing members and editing logged matches. Kept only in memory
  // (gone on refresh) and forgotten if the server says it's wrong.
  const [passcode, setPasscode] = useState('')

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

  async function withPasscode<T>(action: () => Promise<T>) {
    try {
      return await action()
    } catch (err) {
      if (err instanceof Error && err.message === 'wrong passcode') setPasscode('')
      throw err
    }
  }

  async function handleDeletePlayer(id: number) {
    await withPasscode(() => api.deletePlayer(id, passcode))
    await refresh()
  }

  async function handleAddMatch(payload: MatchPayload) {
    await api.createMatch(payload)
    await refresh()
    setSheet(null)
    setTab('standings')
  }

  async function handleUpdateMatch(id: number, payload: MatchPayload) {
    await withPasscode(() => api.updateMatch(id, payload, passcode))
    await refresh()
    setEditing(null)
  }

  return (
    <div className="mx-auto min-h-svh max-w-md bg-emerald-950">
      <header className="flex h-52 flex-col items-center justify-center bg-gradient-to-b from-emerald-600 to-emerald-950 px-6 pb-8 text-center text-white">
        <div className="text-5xl">🎾</div>
        <h1 className="mt-2 text-2xl font-bold">
          {page === 'league' ? LEAGUE_NAME : 'PDX Courts'}
        </h1>
        <p className="text-sm text-emerald-100/70">
          {page === 'league'
            ? `${players.length} ${players.length === 1 ? 'player' : 'players'}`
            : `${PARKS.length} parks · ${TOTAL_COURTS} courts`}
        </p>
      </header>

      <main className="-mt-6 min-h-[calc(100svh-10rem)] rounded-t-[2rem] bg-white px-4 pt-5 pb-40 dark:bg-neutral-900">
        {page === 'courts' ? (
          <CourtsTable />
        ) : (
          <>
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
              <MatchList matches={matches} onEdit={setEditing} />
            )}
          </>
        )}
      </main>

      {page === 'league' && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 mx-auto flex max-w-md justify-end px-6">
          <button
            onClick={() => setSheet('match')}
            className="pointer-events-auto rounded-full bg-neutral-900 px-6 py-4 text-base font-medium text-white shadow-lg active:bg-black"
          >
            + Match
          </button>
        </div>
      )}

      <BottomNav page={page} onChange={setPage} />

      <Sheet open={sheet === 'match'} title="Log a match" onClose={() => setSheet(null)}>
        <MatchForm players={players} onSubmit={handleAddMatch} />
      </Sheet>
      <Sheet open={editing !== null} title="Edit match" onClose={() => setEditing(null)}>
        {editing && (
          <MatchForm
            key={editing.id}
            players={players}
            initial={editing}
            passcode={passcode}
            onPasscodeChange={setPasscode}
            onSubmit={(payload) => handleUpdateMatch(editing.id, payload)}
          />
        )}
      </Sheet>
      <Sheet open={sheet === 'player'} title="Members" onClose={() => setSheet(null)}>
        <MembersPanel
          players={players}
          matches={matches}
          passcode={passcode}
          onPasscodeChange={setPasscode}
          onAdd={handleAddPlayer}
          onDelete={handleDeletePlayer}
        />
      </Sheet>
    </div>
  )
}

export default App
