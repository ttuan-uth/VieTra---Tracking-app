import type { Shipment, TransportMode } from '../types/domain'
import type { LatLng } from './geo'

export type ScenarioType =
  | 'congestion'
  | 'accident'
  | 'road-closure'
  | 'reroute'
  | 'storm'
  | 'port-congestion'
  | 'security'
  | 'air-delay'
  | 'air-reschedule'

export type ScenarioSeverity = 'low' | 'medium' | 'high'

export interface Scenario {
  id: string
  shipmentId: string
  legId: string
  mode: TransportMode
  type: ScenarioType
  label: string
  severity: ScenarioSeverity
  startAt: string
  endAt: string
  speedFactor: number
  extraWaitHours: number
  detourKm: number
  center?: LatLng
  radiusKm: number
  active: boolean
  createdAt: string
}

export interface TrackPoint extends LatLng {
  t: number
  mode: TransportMode
  legId: string
  speedKmh: number
  legProgress: number
  delayed: boolean
  incident: boolean
}

export interface LegState {
  legId: string
  mode: TransportMode
  label: string
  plannedStart: number
  plannedEnd: number
  actualStart: number
  actualEnd: number
  delayMinutes: number
  affected: boolean
  incident: boolean
  distanceKm: number
  status: 'pending' | 'running' | 'completed'
}

export interface JourneyEvent {
  id: string
  at: number
  type: 'departure' | 'arrival' | 'wait' | 'handover' | 'scenario' | 'milestone' | 'info'
  title: string
  detail: string
  legId?: string
  severity: 'info' | 'warning' | 'critical'
}

export interface JourneyAlert {
  id: string
  type: string
  severity: 'warning' | 'critical' | 'info'
  title: string
  detail: string
  at: number
  legId: string
  impactMinutes: number
  status: 'open' | 'acknowledged'
}

export interface Journey {
  shipmentId: string
  windowStart: number
  windowEnd: number
  plannedStart: number
  plannedEnd: number
  projectedEnd: number
  delayMinutes: number
  legs: LegState[]
  samples: TrackPoint[]
  events: JourneyEvent[]
  alerts: JourneyAlert[]
  obstacles: Array<{ id: string; scenario: Scenario; from: number; to: number; severity: ScenarioSeverity }>
}

export interface Snapshot {
  time: number
  point: LatLng
  speedKmh: number
  leg: LegState | null
  legIndex: number
  progress: number
  mode: TransportMode
  eta: number
  delayMinutes: number
  delivered: boolean
  awaiting: boolean
}

export interface BuildContext {
  shipment: Shipment
  scenarios: Scenario[]
}
