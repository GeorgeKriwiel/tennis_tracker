// Address lookup and drive times, using free public services that allow calls straight from the
// browser (so a visitor's address or location goes to them, never through our own server):
//   - OpenStreetMap Nominatim: address -> coordinates
//   - OSRM public demo router: real driving times, one request for all parks
// Both are best-effort with no uptime guarantee, so drive times fall back to a straight-line estimate.
import type { Park } from '../data/courts'

export interface LatLng {
  lat: number
  lng: number
}

export interface Origin extends LatLng {
  label: string
}

// Portland metro area (west, north, east, south); address lookups are limited to it.
const METRO_VIEWBOX = '-123.25,45.80,-122.30,45.25'

export async function geocodeAddress(query: string): Promise<Origin> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us' +
    `&viewbox=${METRO_VIEWBOX}&bounded=1&q=${encodeURIComponent(query)}`
  let results: { lat: string; lon: string; display_name: string }[]
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    results = await res.json()
  } catch {
    throw new Error("Couldn't reach the address lookup. Try again, or use your location.")
  }
  if (results.length === 0) {
    throw new Error("Couldn't find that address in the Portland area. Try adding a street number.")
  }
  const [first] = results
  return {
    lat: Number(first.lat),
    lng: Number(first.lon),
    label: query.trim(),
  }
}

export function getCurrentLocation(): Promise<Origin> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error("This browser can't share your location. Type an address instead."))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Your location' }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? 'Location access was blocked. Allow it for this site, or type an address instead.'
              : "Couldn't get your location. Type an address instead.",
          ),
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  })
}

function distanceKm(a: LatLng, b: LatLng) {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

// Rough city-driving estimate: roads are ~30% longer than a straight line, at ~35 km/h average.
function estimateMinutes(origin: LatLng, park: LatLng) {
  return (distanceKm(origin, park) * 1.3 * 60) / 35
}

export interface DriveTimes {
  // Minutes to each park, keyed by park name.
  minutes: Record<string, number>
  // true when the routing service was unreachable and these are straight-line estimates.
  estimated: boolean
}

export async function getDriveTimes(origin: LatLng, parks: Park[]): Promise<DriveTimes> {
  const fallback = (): DriveTimes => ({
    minutes: Object.fromEntries(parks.map((p) => [p.name, estimateMinutes(origin, p)])),
    estimated: true,
  })

  // OSRM takes "lng,lat" pairs; source 0 is the visitor, the rest are the parks.
  const coords = [origin, ...parks].map((p) => `${p.lng},${p.lat}`).join(';')
  try {
    const res = await fetch(
      `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=duration`,
    )
    if (!res.ok) return fallback()
    const data: { code: string; durations?: (number | null)[][] } = await res.json()
    const row = data.code === 'Ok' ? data.durations?.[0] : undefined
    if (!row || row.length !== parks.length + 1) return fallback()

    const minutes: Record<string, number> = {}
    for (const [i, park] of parks.entries()) {
      const seconds = row[i + 1]
      minutes[park.name] = seconds == null ? estimateMinutes(origin, park) : seconds / 60
    }
    return { minutes, estimated: false }
  } catch {
    return fallback()
  }
}
