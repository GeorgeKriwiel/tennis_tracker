import { useState } from 'react'
import { roundElo, type Profile } from '../lib/records'

const W = 340
const H = 150
const PAD = { top: 10, right: 8, bottom: 22, left: 36 }
const STEP = 25

// ELO over time, one point per match (plus the 1200 starting point). Points are evenly
// spaced by match rather than by date, so a busy day doesn't bunch up. Drag/hover to scrub.
export function RatingChart({ points }: { points: Profile['ratingPoints'] }) {
  const [active, setActive] = useState<number | null>(null)

  const elos = points.map((p) => p.elo)
  const lo = Math.floor((Math.min(...elos) - 5) / STEP) * STEP
  const hi = Math.max(Math.ceil((Math.max(...elos) + 5) / STEP) * STEP, lo + 2 * STEP)
  const mid = Math.round((lo + hi) / 2)

  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (points.length === 1 ? plotW : (i / (points.length - 1)) * plotW)
  const y = (elo: number) => PAD.top + ((hi - elo) / (hi - lo)) * plotH

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.elo)}`).join('')
  const area = `${line}L${x(points.length - 1)},${PAD.top + plotH}L${x(0)},${PAD.top + plotH}Z`

  function scrub(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((svgX - PAD.left) / plotW) * (points.length - 1))
    setActive(Math.max(0, Math.min(points.length - 1, i)))
  }

  const shown = active ?? points.length - 1
  const point = points[shown]

  return (
    <div className="relative text-court dark:text-ball">
      {/* Readout instead of a floating tooltip, so a finger never covers what it's scrubbing */}
      <div className="mb-1 flex h-10 items-end justify-between">
        <div>
          <div className="text-xs text-neutral-500">
            {active === null
              ? 'Rating'
              : point.opponentName
                ? `vs ${point.opponentName} · ${point.date}`
                : 'Starting rating'}
          </div>
          <div className="text-lg leading-tight font-semibold text-neutral-900 tabular-nums dark:text-neutral-100">
            {roundElo(point.elo)} ELO
          </div>
        </div>
        {active === null && (
          <div className="text-xs text-neutral-400">Drag the chart to explore</div>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-pan-y select-none"
        role="img"
        aria-label={`Rating history: from ${roundElo(points[0].elo)} to ${roundElo(points[points.length - 1].elo)} over ${points.length - 1} matches`}
        onPointerDown={scrub}
        onPointerMove={scrub}
        onPointerLeave={() => setActive(null)}
        onPointerCancel={() => setActive(null)}
      >
        {[hi, mid, lo].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              className="stroke-neutral-200 dark:stroke-neutral-800"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y(v)}
              dy="0.35em"
              textAnchor="end"
              className="fill-neutral-400 text-[10px]"
            >
              {v}
            </text>
          </g>
        ))}
        <path d={area} fill="currentColor" opacity={0.1} />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {active !== null && (
          <line
            x1={x(shown)}
            x2={x(shown)}
            y1={PAD.top}
            y2={PAD.top + plotH}
            className="stroke-neutral-400"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}
        <circle
          cx={x(shown)}
          cy={y(point.elo)}
          r={4.5}
          fill="currentColor"
          className="stroke-white dark:stroke-neutral-900"
          strokeWidth={2}
        />
        <text x={PAD.left} y={H - 6} className="fill-neutral-400 text-[10px]">
          Start
        </text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" className="fill-neutral-400 text-[10px]">
          {points[points.length - 1].date ?? ''}
        </text>
      </svg>
    </div>
  )
}
