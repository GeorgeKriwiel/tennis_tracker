import { useState } from 'react'
import { PARKS } from '../data/courts'
import type { ApiMatch, ApiPlayer, MatchPayload } from '../lib/api'
import { PasscodeInput } from './PasscodeInput'

const field =
  'w-full rounded border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900'

const PARK_NAMES = PARKS.map((p) => p.name).sort((a, b) => a.localeCompare(b))

// Logging a new match needs no passcode. Pass `initial` (plus the passcode props) to edit a
// match that's already been logged, which does.
export function MatchForm({
  players,
  onSubmit,
  onDelete,
  initial,
  passcode,
  onPasscodeChange,
}: {
  players: ApiPlayer[]
  onSubmit: (payload: MatchPayload) => Promise<void>
  // Only when editing: permanently deletes the match (passcode required).
  onDelete?: () => Promise<void>
  initial?: ApiMatch
  passcode?: string
  onPasscodeChange?: (value: string) => void
}) {
  const editing = initial !== undefined

  const [playedOn, setPlayedOn] = useState(
    () => initial?.played_on.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  )
  // Player ids in the order they were tapped: first is player A, second is B.
  const [picked, setPicked] = useState<number[]>(() =>
    initial ? [initial.player_a_id, initial.player_b_id] : [],
  )
  const [scoreA, setScoreA] = useState(() => (initial ? String(initial.score_a) : ''))
  const [scoreB, setScoreB] = useState(() => (initial ? String(initial.score_b) : ''))
  const [park, setPark] = useState(initial?.park ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const playerA = players.find((p) => p.id === picked[0])
  const playerB = players.find((p) => p.id === picked[1])

  // A match's park may not be in the courts list (older data), so keep it selectable.
  const parkOptions = park && !PARK_NAMES.includes(park) ? [park, ...PARK_NAMES] : PARK_NAMES

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
    if (editing && !passcode?.trim()) {
      setError('Enter the passcode to edit a match')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        playedOn,
        playerAId: playerA.id,
        playerBId: playerB.id,
        scoreA: a,
        scoreB: b,
        park: park || undefined,
        notes: notes.trim() || undefined,
      })
      if (!editing) {
        setPicked([])
        setScoreA('')
        setScoreB('')
        setNotes('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save match')
    } finally {
      setSubmitting(false)
    }
  }

  async function remove() {
    if (!onDelete) return
    if (!passcode?.trim()) {
      setError('Enter the passcode to delete a match')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onDelete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete match')
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
          {parkOptions.map((name) => (
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

      {editing && onPasscodeChange && (
        <PasscodeInput value={passcode ?? ''} onChange={onPasscodeChange} />
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white active:bg-blue-700 disabled:opacity-50"
      >
        {editing ? 'Save changes' : 'Log match'}
      </button>

      {editing &&
        onDelete &&
        (confirmingDelete ? (
          <div className="flex flex-col gap-2 rounded-lg border border-red-200 p-3 dark:border-red-900">
            <p className="text-xs text-red-500">
              This permanently deletes the match and recalculates everyone’s ratings. It can’t be
              undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={remove}
                className="flex-1 rounded bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Confirm delete
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmingDelete(false)}
                className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setError(null)
              setConfirmingDelete(true)
            }}
            className="text-sm text-red-500"
          >
            Delete match
          </button>
        ))}
    </form>
  )
}
