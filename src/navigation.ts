export type Screen = 'quote' | 'services' | 'booking' | 'bookings' | 'tracking'

export interface TrackingFocus {
  legId?: string
  alertId?: string
  simAt?: string
}
