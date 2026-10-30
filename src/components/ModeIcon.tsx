import { Plane, Ship, TrainFront, Truck } from 'lucide-react'
import type { TransportMode } from '../types/domain'

export function ModeIcon({ mode, size = 14 }: { mode: TransportMode; size?: number }) {
  if (mode === 'air') return <Plane size={size} aria-hidden="true" />
  if (mode === 'rail') return <TrainFront size={size} aria-hidden="true" />
  if (mode === 'ocean') return <Ship size={size} aria-hidden="true" />
  return <Truck size={size} aria-hidden="true" />
}
