import { useState } from 'react'
import type { ApiPlayer } from '../lib/api'
import { AddPlayerForm } from './AddPlayerForm'

export function MembersPanel({
  players,
  onAdd,
  onDelete,
}: {
  players: ApiPlayer[]
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

  return (
    <div className="flex flex-col gap-4">
      <AddPlayerForm onAdd={onAdd} />

      {players.length > 0 && (
        <ul className="flex flex-col">
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 border-b border-neutral-100 py-3 last:border-0 dark:border-neutral-800"
            >
              <span className="truncate text-neutral-900 dark:text-neutral-100">
                {p.name}
              </span>
              {confirmingId === p.id ? (
                <span className="flex shrink-0 items-center gap-3 text-sm">
                  <button
                    disabled={busy}
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
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-neutral-400">
        Removing a player with logged matches hides them from standings but keeps
        those matches, so everyone else’s ratings stay correct.
      </p>
    </div>
  )
}
