import { useState } from 'react'
import type { ApiPlayer } from '../lib/api'

const field =
  'w-full rounded border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900'

export function MatchForm({
  players,
  onAdd,
}: {
  players: ApiPlayer[]
  onAdd: (payload: {
    playedOn: string
    playerAId: number
    playerBId: number
    scoreA: number
    scoreB: number
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
  const [scoreA, setScoreA] = useState('')
  const [scoreB, setScoreB] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!playerAId || !playerBId) return
    if (playerAId === playerBId) {
      setError('Players must be different')
      return
    }

    const a = Number(scoreA)
    const b = Number(scoreB)
    if (scoreA === '' || scoreB === '' || !Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      setError('Enter the games each player won')
      return
    }
    if (a === 0 && b === 0) {
      setError('Enter a score')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onAdd({
        playedOn,
        playerAId: Number(playerAId),
        playerBId: Number(playerBId),
        scoreA: a,
        scoreB: b,
        notes: notes.trim() || undefined,
      })
      setScoreA('')
      setScoreB('')
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log match')
    } finally {
      setSubmitting(false)
    }
  }

  if (players.length < 2) {
    return (
      <p className="py-4 text-center text-sm text-neutral-500">
        Add at least 2 players first (use “Manage members”).
      </p>
    )
  }

  const playerOptions = players.map((p) => (
    <option key={p.id} value={p.id}>
      {p.name}
    </option>
  ))

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        type="date"
        value={playedOn}
        onChange={(e) => setPlayedOn(e.target.value)}
        className={field}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <select
            value={playerAId}
            onChange={(e) => setSelectedAId(Number(e.target.value))}
            className={field}
          >
            {playerOptions}
          </select>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Games"
            value={scoreA}
            onChange={(e) => setScoreA(e.target.value)}
            className={`${field} text-center text-lg`}
          />
        </div>
        <div className="flex flex-col gap-2">
          <select
            value={playerBId}
            onChange={(e) => setSelectedBId(Number(e.target.value))}
            className={field}
          >
            {playerOptions}
          </select>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Games"
            value={scoreB}
            onChange={(e) => setScoreB(e.target.value)}
            className={`${field} text-center text-lg`}
          />
        </div>
      </div>

      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className={field}
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
