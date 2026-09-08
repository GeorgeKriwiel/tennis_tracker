import { useState } from 'react'
import type { ApiPlayer, SetScore } from '../lib/api'

const emptySet = (): SetScore => ({ playerA: 0, playerB: 0 })

export function MatchForm({
  players,
  onAdd,
}: {
  players: ApiPlayer[]
  onAdd: (payload: {
    playedOn: string
    playerAId: number
    playerBId: number
    sets: SetScore[]
    notes?: string
  }) => Promise<void>
}) {
  const [playedOn, setPlayedOn] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [selectedAId, setSelectedAId] = useState<number | ''>('')
  const [selectedBId, setSelectedBId] = useState<number | ''>('')
  const playerAId = selectedAId !== '' ? selectedAId : (players[0]?.id ?? '')
  const playerBId = selectedBId !== '' ? selectedBId : (players[1]?.id ?? '')
  const [sets, setSets] = useState<SetScore[]>([emptySet()])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateSet(index: number, field: keyof SetScore, value: number) {
    setSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!playerAId || !playerBId) return
    if (playerAId === playerBId) {
      setError('Players must be different')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onAdd({
        playedOn,
        playerAId: Number(playerAId),
        playerBId: Number(playerBId),
        sets,
        notes: notes.trim() || undefined,
      })
      setSets([emptySet()])
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log match')
    } finally {
      setSubmitting(false)
    }
  }

  if (players.length < 2) {
    return (
      <p className="rounded-lg bg-white p-4 text-center text-sm text-neutral-500 shadow-sm dark:bg-neutral-800">
        Add at least 2 players above to log a match.
      </p>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm dark:bg-neutral-800"
    >
      <input
        type="date"
        value={playedOn}
        onChange={(e) => setPlayedOn(e.target.value)}
        className="rounded border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
      />

      <div className="flex items-center gap-2">
        <select
          value={playerAId}
          onChange={(e) => setSelectedAId(Number(e.target.value))}
          className="flex-1 rounded border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
        >
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-neutral-400">vs</span>
        <select
          value={playerBId}
          onChange={(e) => setSelectedBId(Number(e.target.value))}
          className="flex-1 rounded border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
        >
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        {sets.map((set, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-12 text-xs text-neutral-500">Set {i + 1}</span>
            <input
              type="number"
              min={0}
              value={set.playerA}
              onChange={(e) => updateSet(i, 'playerA', Number(e.target.value))}
              className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            />
            <span className="text-neutral-400">-</span>
            <input
              type="number"
              min={0}
              value={set.playerB}
              onChange={(e) => updateSet(i, 'playerB', Number(e.target.value))}
              className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            />
            {sets.length > 1 && (
              <button
                type="button"
                onClick={() => setSets((prev) => prev.filter((_, j) => j !== i))}
                className="ml-auto text-xs text-red-500"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setSets((prev) => [...prev, emptySet()])}
          className="self-start text-xs text-blue-600 dark:text-blue-400"
        >
          + Add set
        </button>
      </div>

      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white active:bg-blue-700 disabled:opacity-50"
      >
        Log match
      </button>
    </form>
  )
}
