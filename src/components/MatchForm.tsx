import { useState } from 'react'
import { PARKS } from '../data/courts'
import type { ApiPlayer } from '../lib/api'

const field =
  'w-full rounded border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900'

const PARK_NAMES = PARKS.map((p) => p.name).sort((a, b) => a.localeCompare(b))

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
    park?: string
    notes?: string
  }) => Promise<void>
}) {
  const [playedOn, setPlayedOn] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  // Player ids in the order they were tapped: first is player A, second is B.
  const [picked, setPicked] = useState<number[]>([])
  const [scoreA, setScoreA] = useState('')
  const [scoreB, setScoreB] = useState('')
  const [park, setPark] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const playerA = players.find((p) => p.id === picked[0])
  const playerB = players.find((p) => p.id === picked[1])

  function togglePlayer(id: number) {
    setError(null)
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      // A third tap replaces the earliest pick.
      return prev.length >= 2 ? [prev[1], id] : [...prev, id]
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!playerA || !playerB) {
      setError('Tap two players')
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
        playerAId: playerA.id,
        playerBId: playerB.id,
        scoreA: a,
        scoreB: b,
        park: park || undefined,
        notes: notes.trim() || undefined,
      })
      setPicked([])
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

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-xs text-neutral-500">Who played? Tap two players</p>
        <div className="flex flex-wrap gap-2">
          {players.map((p) => {
            const selected = picked.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={selected}
                onClick={() => togglePlayer(p.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-neutral-300 text-neutral-700 dark:border-neutral-600 dark:text-neutral-200'
                }`}
              >
                {p.name}
              </button>
            )
          })}
        </div>
      </div>

      {playerA && playerB && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            <span className="truncate">{playerA.name}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Games"
              value={scoreA}
              onChange={(e) => setScoreA(e.target.value)}
              className={`${field} text-center text-lg`}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            <span className="truncate">{playerB.name}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Games"
              value={scoreB}
              onChange={(e) => setScoreB(e.target.value)}
              className={`${field} text-center text-lg`}
            />
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <input
          type="date"
          value={playedOn}
          onChange={(e) => setPlayedOn(e.target.value)}
          className={field}
        />
        <select value={park} onChange={(e) => setPark(e.target.value)} className={field}>
          <option value="">Park (optional)</option>
          {PARK_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
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
