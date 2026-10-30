export type UserRole = 'customer' | 'admin'

export interface AuthUser {
  id: string
  email: string
  name: string
  company: string | null
  role: UserRole
}

export type HandoffMode = 'deliver-to-warehouse' | 'carrier-pickup'
export type FreightTerm = 'prepaid' | 'collect'
export type CargoType = 'quick-estimation' | 'fcl' | 'lcl'
export type UnitSystem = 'metric' | 'imperial'
export type CargoHandling = 'general' | 'special'
export type TransportMode = 'road' | 'ocean' | 'air' | 'rail'
export type BookingStep = 'service' | 'route' | 'cargo' | 'documents' | 'billing'
export type BookingStatus = 'awaiting-documents' | 'needs-docs' | 'confirmed'
export type DocumentStatus = 'pending' | 'verified' | 'needs-fix'
export type NotificationType =
  | 'document-fix'
  | 'code-issued'
  | 'handover'
  | 'transport-alert'
export type AlertNotificationSeverity = 'warning' | 'critical'

export interface UserNotification {
  id: string
  type: NotificationType
  title: string
  detail: string
  createdAt: string
  read: boolean
  bookingId?: string
  shipmentCode?: string
  severity?: AlertNotificationSeverity
  legId?: string
  legLabel?: string
  alertId?: string
  simAt?: string
}

export interface TransportAlertNotice {
  shipmentCode: string
  alertId: string
  legId: string
  legLabel: string
  title: string
  detail: string
  severity: AlertNotificationSeverity
  simAt: string
}
export type ShipmentStatus = 'awaiting-handover' | 'in-transit' | 'delivered'
export type ServiceSort = 'recommended' | 'earliest' | 'cheapest' | 'cleanest'
export type CustomerType = 'business' | 'individual'

export interface Address {
  countryCode: string
  search: string
  street: string
  postalCode: string
  city: string
  placeId?: string
  lat?: number
  lng?: number
}

export interface CargoLine {
  id: string
  packageType: string
  quantity: number
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
}

export interface QuoteDraft {
  handoff: HandoffMode
  pickup: Address
  delivery: Address
  freightTerm: FreightTerm
  cargoType: CargoType
  unitSystem: UnitSystem
  lines: CargoLine[]
  containerId: string
  handling: CargoHandling
  specialTypes: string[]
  customerType: CustomerType
  companyName: string
  contactName: string
  email: string
  phone: string
  marketingOptIn: boolean
  termsAccepted: boolean
}

export interface ContactDetails {
  customerType: CustomerType
  companyName: string
  fullName: string
  email: string
  phone: string
  marketingOptIn: boolean
  termsAccepted: boolean
}

export interface ServiceAddons {
  exportCustoms: boolean
  importCustoms: boolean
  declarationLines: number
  cargoInsurance: boolean
  insuredValue: number
  insuredCurrency: 'VND' | 'USD' | 'EUR'
  sustainability: 'none' | 'fuel' | 'offset'
  incoterm: string
}

export interface RouteBooking {
  shipperSameAsPickup: boolean
  consigneeSameAsDelivery: boolean
  shipperAddress: Address
  consigneeAddress: Address
  pickupDate: string
}

export interface BillingDetails {
  companyName: string
  reference: string
  invoiceEmail: string
  taxId: string
  addressMode: 'shipper' | 'new'
  billingCompanyName: string
  billingStreet: string
  billingCity: string
  billingState: string
  billingPostalCode: string
  billingCountry: string
  recipients: string[]
  shareConfirmed: boolean
}

export interface DemoDocument {
  id: string
  slotId: string
  name: string
  sizeBytes: number
  status: DocumentStatus
  note?: string
  uploadedAt: string
  verifiedAt?: string
}

export interface Booking {
  id: string
  code?: string
  status: BookingStatus
  createdAt: string
  quote: QuoteDraft
  contact: ContactDetails
  serviceId: string
  addons: ServiceAddons
  route: RouteBooking
  billing: BillingDetails
  documents: DemoDocument[]
  shipmentId?: string
  ownerId?: string
}

export interface Waypoint {
  name: string
  code?: string
  kind: 'warehouse' | 'port' | 'airport' | 'hub' | 'consignee'
  lat: number
  lng: number
}

export interface RouteLeg {
  id: string
  mode: TransportMode
  label: string
  from: Waypoint
  to: Waypoint
  path: Array<{ lat: number; lng: number }>
  plannedDeparture: string
  plannedArrival: string
  speedKmh: number
  waitAfterHours: number
}

export interface Shipment {
  id: string
  code: string
  customer: string
  serviceName: string
  mode: 'ocean' | 'air' | 'rail'
  handoff: HandoffMode
  handoverNote: string
  handoverAt: string
  handoverConfirmedAt: string | null
  status: ShipmentStatus
  legs: RouteLeg[]
  origin: string
  destination: string
  cargoSummary: string
  specialCargo: string[]
  vehicleName: string
  vehiclePlate: string
  createdAt: string
}

export interface ServiceOption {
  id: string
  name: string
  mode: 'ocean' | 'air' | 'rail'
  modeLabel: string
  scope: string
  customs: string
  transitDays: [number, number]
  emissionsKg: number
  emissionsNote: string
  priceVnd: number
  priceNote: string
  eligible: boolean
  eligibilityNote?: string
  badges: Array<{ label: string; tone: 'success' | 'warning' | 'danger' | 'accent' }>
  conditions: string[]
  exclusions: string[]
  departure: string
  arrival: string
}
