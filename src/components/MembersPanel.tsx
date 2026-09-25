import { useState } from 'react'
import type { ApiMatch, ApiPlayer } from '../lib/api'
import { AddPlayerForm } from './AddPlayerForm'
import { PasscodeInput } from './PasscodeInput'

export function MembersPanel({
  players,
  matches,
  passcode,
  onPasscodeChange,
  onAdd,
  onDelete,
}: {
  players: ApiPlayer[]
  matches: ApiMatch[]
  passcode: string
  onPasscodeChange: (value: string) => void
  onAdd: (name: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove(id: number) {
    setBusy(true)
    setError(null)
    try {
      await onDelete(id)
      setConfirmingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove player')
    } finally {
      setBusy(false)
    }
  }

  function matchCount(playerId: number) {
    return matches.filter(
      (m) => m.player_a_id === playerId || m.player_b_id === playerId,
    ).length
  }

  return (
    <div className="flex flex-col gap-4">
      <AddPlayerForm onAdd={onAdd} />

      {players.length > 0 && (
        <ul className="flex flex-col">
          {players.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-x-2 border-b border-neutral-100 py-3 last:border-0 dark:border-neutral-800"
            >
              <span className="truncate text-neutral-900 dark:text-neutral-100">
                {p.name}
              </span>
              {confirmingId === p.id ? (
                <span className="flex shrink-0 items-center gap-3 text-sm">
                  <button
                    disabled={busy || !passcode.trim()}
                    onClick={() => remove(p.id)}
                    className="font-medium text-red-600 disabled:opacity-50"
                  >
                    Confirm remove
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => setConfirmingId(null)}
                    className="text-neutral-500"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => {
                    setError(null)
                    setConfirmingId(p.id)
                  }}
                  className="shrink-0 text-sm text-red-500"
                >
                  Remove
                </button>
              )}
              {confirmingId === p.id && (
                <p className="basis-full pt-1 text-xs text-red-500">
                  {matchCount(p.id) === 0
                    ? 'This player has no matches.'
                    : `This also permanently deletes their ${matchCount(p.id)} ${matchCount(p.id) === 1 ? 'match' : 'matches'} and recalculates everyone's ratings.`}
                </p>
              )}
              {confirmingId === p.id && (
                <div className="basis-full pt-2">
                  <PasscodeInput value={passcode} onChange={onPasscodeChange} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
