export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export interface PreparedPath {
  points: LatLng[]
  cumulative: number[]
  totalKm: number
}

export function preparePath(points: LatLng[]): PreparedPath {
  const cumulative: number[] = [0]
  for (let i = 1; i < points.length; i += 1) {
    cumulative.push(cumulative[i - 1] + haversineKm(points[i - 1], points[i]))
  }
  return { points, cumulative, totalKm: cumulative[cumulative.length - 1] ?? 0 }
}

export function pointAtKm(path: PreparedPath, km: number): LatLng {
  if (path.points.length === 0) return { lat: 0, lng: 0 }
  const target = Math.max(0, Math.min(km, path.totalKm))
  let index = 1
  while (index < path.cumulative.length && path.cumulative[index] < target) index += 1
  if (index >= path.cumulative.length) {
    return path.points[path.points.length - 1]
  }
  const prev = path.cumulative[index - 1]
  const span = path.cumulative[index] - prev
  const ratio = span === 0 ? 0 : (target - prev) / span
  const a = path.points[index - 1]
  const b = path.points[index]
  return { lat: a.lat + (b.lat - a.lat) * ratio, lng: a.lng + (b.lng - a.lng) * ratio }
}

export function midpoint(a: LatLng, b: LatLng): LatLng {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 }
}
