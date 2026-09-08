import { useState } from 'react'
import type { Match, MatchResult, SetScore } from '../types/match'

const emptySet = (): SetScore => ({ mine: 0, opponent: 0 })

export function MatchForm({
  onAdd,
}: {
  onAdd: (match: Match) => void
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [opponent, setOpponent] = useState('')
  const [result, setResult] = useState<MatchResult>('win')
  const [sets, setSets] = useState<SetScore[]>([emptySet()])
  const [notes, setNotes] = useState('')

  function updateSet(index: number, field: keyof SetScore, value: number) {
    setSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    )
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!opponent.trim()) return

    onAdd({
      id: crypto.randomUUID(),
      date,
      opponent: opponent.trim(),
      result,
      sets,
      notes: notes.trim() || undefined,
    })

    setOpponent('')
    setSets([emptySet()])
    setNotes('')
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm dark:bg-neutral-800"
    >
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 rounded border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
        />
        <select
          value={result}
          onChange={(e) => setResult(e.target.value as MatchResult)}
          className="rounded border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
        >
          <option value="win">Win</option>
          <option value="loss">Loss</option>
        </select>
      </div>

      <input
        placeholder="Opponent name"
        value={opponent}
        onChange={(e) => setOpponent(e.target.value)}
        required
        className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
      />

      <div className="flex flex-col gap-2">
        {sets.map((set, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-12 text-xs text-neutral-500">Set {i + 1}</span>
            <input
              type="number"
              min={0}
              value={set.mine}
              onChange={(e) => updateSet(i, 'mine', Number(e.target.value))}
              className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            />
            <span className="text-neutral-400">-</span>
            <input
              type="number"
              min={0}
              value={set.opponent}
              onChange={(e) =>
                updateSet(i, 'opponent', Number(e.target.value))
              }
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

      <button
        type="submit"
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white active:bg-blue-700"
      >
        Log match
      </button>
    </form>
  )
}
