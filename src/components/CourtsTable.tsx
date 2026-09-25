import { useMemo, useState } from 'react'
import { PARKS } from '../data/courts'
import { geocodeAddress, getCurrentLocation, getDriveTimes, type DriveTimes, type Origin } from '../lib/geo'

type SortKey = 'name' | 'courts' | 'drive'

export function CourtsTable() {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [ascending, setAscending] = useState(true)

  const [address, setAddress] = useState('')
  const [origin, setOrigin] = useState<Origin | null>(null)
  const [drive, setDrive] = useState<DriveTimes | null>(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = PARKS.filter((p) => p.name.toLowerCase().includes(q))
    const dir = ascending ? 1 : -1
    return [...filtered].sort((a, b) => {
      const byName = a.name.localeCompare(b.name)
      if (sortKey === 'name') return dir * byName
      if (sortKey === 'courts') return dir * (a.courts - b.courts) || byName
      return dir * ((drive?.minutes[a.name] ?? 0) - (drive?.minutes[b.name] ?? 0)) || byName
    })
  }, [query, sortKey, ascending, drive])

  const totalCourts = rows.reduce((sum, p) => sum + p.courts, 0)

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setAscending((a) => !a)
    } else {
      setSortKey(key)
      // Names and drive times default to ascending; courts to most-first.
      setAscending(key !== 'courts')
    }
  }

  async function findFrom(getOrigin: () => Promise<Origin>) {
    setLocating(true)
    setLocateError(null)
    try {
      const found = await getOrigin()
      const times = await getDriveTimes(found, PARKS)
      setOrigin(found)
      setDrive(times)
      setSortKey('drive')
      setAscending(true)
    } catch (err) {
      setLocateError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLocating(false)
    }
  }

  function submitAddress(e: React.FormEvent) {
    e.preventDefault()
    if (!address.trim()) return
    void findFrom(() => geocodeAddress(address))
  }

  function clearOrigin() {
    setOrigin(null)
    setDrive(null)
    setLocateError(null)
    if (sortKey === 'drive') {
      setSortKey('name')
      setAscending(true)
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
      <section className="flex flex-col gap-2 rounded-2xl bg-neutral-100 p-3 dark:bg-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Find courts near you
        </h2>
        <form onSubmit={submitAddress} className="flex gap-2">
          <input
            type="text"
            autoComplete="street-address"
            placeholder="Your address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="min-w-0 flex-1 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          />
          <button
            type="submit"
            disabled={locating || !address.trim()}
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Find
          </button>
        </form>
        <button
          type="button"
          disabled={locating}
          onClick={() => void findFrom(getCurrentLocation)}
          className="rounded-full border border-neutral-300 bg-white py-2 text-sm font-medium text-neutral-800 disabled:opacity-40 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
        >
          📍 Use my location
        </button>

        {locating && <p className="text-xs text-neutral-500">Working out drive times…</p>}
        {locateError && <p className="text-xs text-red-500">{locateError}</p>}
        {origin && !locating && (
          <p className="text-xs text-neutral-500">
            Drive times from <span className="font-medium">{origin.label}</span> ·{' '}
            <button onClick={clearOrigin} className="underline">
              Clear
            </button>
          </p>
        )}
        {drive?.estimated && !locating && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            The driving-time service didn’t respond, so these are rough straight-line estimates (≈).
          </p>
        )}
      </section>

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
            {drive && header('drive', 'Drive', 'text-right')}
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
              {drive && (
                <td className="py-3 text-right tabular-nums text-neutral-600 dark:text-neutral-300">
                  {drive.estimated && '≈ '}
                  {Math.max(1, Math.round(drive.minutes[p.name]))} min
                </td>
              )}
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
              {drive && <td />}
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
