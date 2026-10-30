import type { Booking, AuthUser, Shipment, UserNotification } from '../types/domain'
import type { Scenario } from '../sim/types'

export interface AuthResponse {
  user: AuthUser
}

export interface AppStateResponse {
  bookings: Booking[]
  shipments: Shipment[]
  scenarios: Scenario[]
  notifications: UserNotification[]
}

export interface TransportAlertResponse {
  created: number
}
