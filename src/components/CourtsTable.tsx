import { useMemo, useState } from 'react'
import { PARKS } from '../data/courts'

type SortKey = 'name' | 'courts'

export function CourtsTable() {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [ascending, setAscending] = useState(true)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = PARKS.filter((p) => p.name.toLowerCase().includes(q))
    const dir = ascending ? 1 : -1
    return [...filtered].sort((a, b) =>
      sortKey === 'name'
        ? dir * a.name.localeCompare(b.name)
        : dir * (a.courts - b.courts) || a.name.localeCompare(b.name),
    )
  }, [query, sortKey, ascending])

  const totalCourts = rows.reduce((sum, p) => sum + p.courts, 0)

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setAscending((a) => !a)
    } else {
      setSortKey(key)
      // Courts default to most-first; names default to A-Z.
      setAscending(key === 'name')
    }
  }

  const header = (key: SortKey, label: string, align: string) => (
    <th
      scope="col"
      aria-sort={sortKey === key ? (ascending ? 'ascending' : 'descending') : 'none'}
      className={`py-2 font-medium ${align}`}
    >
      <button onClick={() => toggleSort(key)} className="inline-flex items-center gap-1">
        {label}
        <span className="text-xs text-neutral-400">
          {sortKey === key ? (ascending ? '▲' : '▼') : ''}
        </span>
      </button>
    </th>
  )

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        placeholder="Search parks"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-full border border-neutral-200 px-4 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />

      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-700">
          <tr>
            {header('name', 'Park', 'text-left')}
            {header('courts', 'Courts', 'text-right')}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr
              key={p.name}
              className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
            >
              <td className="py-3 text-neutral-900 dark:text-neutral-100">{p.name}</td>
              <td className="py-3 text-right tabular-nums text-neutral-600 dark:text-neutral-300">
                {p.courts}
              </td>
            </tr>
          ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t border-neutral-200 font-medium dark:border-neutral-700">
              <td className="py-3 text-neutral-500">
                {rows.length} {rows.length === 1 ? 'park' : 'parks'}
              </td>
              <td className="py-3 text-right tabular-nums text-neutral-900 dark:text-neutral-100">
                {totalCourts}
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      {rows.length === 0 && (
        <p className="py-8 text-center text-sm text-neutral-500">No parks match “{query}”.</p>
      )}
    </div>
  )
}
