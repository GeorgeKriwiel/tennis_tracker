import { MatchForm } from './components/MatchForm'
import { MatchList } from './components/MatchList'
import { StatsSummary } from './components/StatsSummary'
import { useLocalStorage } from './hooks/useLocalStorage'
import type { Match } from './types/match'

function App() {
  const [matches, setMatches] = useLocalStorage<Match[]>('tennis-matches', [])

  function addMatch(match: Match) {
    setMatches((prev) => [match, ...prev])
  }

  function deleteMatch(id: string) {
    setMatches((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col gap-4 bg-neutral-100 p-4 dark:bg-neutral-900">
      <h1 className="text-center text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        🎾 Tennis Tracker
      </h1>

      <StatsSummary matches={matches} />
      <MatchForm onAdd={addMatch} />
      <MatchList matches={matches} onDelete={deleteMatch} />
    </div>
  )
}

export default App
