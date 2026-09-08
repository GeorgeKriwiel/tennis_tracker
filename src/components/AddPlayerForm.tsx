import { useState } from 'react'

export function AddPlayerForm({
  onAdd,
}: {
  onAdd: (name: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)
    setError(null)
    try {
      await onAdd(name.trim())
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add player')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          placeholder="New player name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-neutral-800 px-4 py-2 text-sm font-medium text-white active:bg-neutral-900 disabled:opacity-50 dark:bg-neutral-700"
        >
          Add
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  )
}
