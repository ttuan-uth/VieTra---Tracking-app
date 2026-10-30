import { z } from 'zod'

const addressSchema = z.object({
  countryCode: z.string().min(1).max(2),
  search: z.string().max(300),
  street: z.string().min(1).max(300),
  postalCode: z.string().min(1).max(30),
  city: z.string().min(1).max(120),
  placeId: z.string().max(200).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

const cargoLineSchema = z.object({
  id: z.string().min(1).max(80),
  packageType: z.string().min(1).max(80),
  quantity: z.number().int().min(1).max(100000),
  weightKg: z.number().min(0).max(1000000),
  lengthCm: z.number().min(0).max(100000),
  widthCm: z.number().min(0).max(100000),
  heightCm: z.number().min(0).max(100000),
})

const quoteSchema = z.object({
  handoff: z.enum(['deliver-to-warehouse', 'carrier-pickup']),
  pickup: addressSchema,
  delivery: addressSchema,
  freightTerm: z.enum(['prepaid', 'collect']),
  cargoType: z.enum(['quick-estimation', 'fcl', 'lcl']),
  unitSystem: z.enum(['metric', 'imperial']),
  lines: z.array(cargoLineSchema).min(1).max(30),
  containerId: z.string().max(80),
  handling: z.enum(['general', 'special']),
  specialTypes: z.array(z.string().max(80)).max(20),
  customerType: z.enum(['business', 'individual']),
  companyName: z.string().max(200),
  contactName: z.string().min(1).max(120),
  email: z.string().email().max(200),
  phone: z.string().min(1).max(40),
  marketingOptIn: z.boolean(),
  termsAccepted: z.boolean(),
})

const contactSchema = z.object({
  customerType: z.enum(['business', 'individual']),
  companyName: z.string().max(200),
  fullName: z.string().min(1).max(120),
  email: z.string().email().max(200),
  phone: z.string().min(1).max(40),
  marketingOptIn: z.boolean(),
  termsAccepted: z.boolean(),
})

const addonsSchema = z.object({
  exportCustoms: z.boolean(),
  importCustoms: z.boolean(),
  declarationLines: z.number().int().min(0).max(1000),
  cargoInsurance: z.boolean(),
  insuredValue: z.number().min(0).max(1_000_000_000_000),
  insuredCurrency: z.enum(['VND', 'USD', 'EUR']),
  sustainability: z.enum(['none', 'fuel', 'offset']),
  incoterm: z.string().max(30),
})

const routeSchema = z.object({
  shipperSameAsPickup: z.boolean(),
  consigneeSameAsDelivery: z.boolean(),
  shipperAddress: addressSchema,
  consigneeAddress: addressSchema,
  pickupDate: z.string().max(40),
})

const billingSchema = z.object({
  companyName: z.string().max(200),
  reference: z.string().max(120),
  invoiceEmail: z.string().email().max(200),
  taxId: z.string().max(80),
  addressMode: z.enum(['shipper', 'new']),
  billingCompanyName: z.string().max(200),
  billingStreet: z.string().max(300),
  billingCity: z.string().max(120),
  billingState: z.string().max(120),
  billingPostalCode: z.string().max(30),
  billingCountry: z.string().max(2),
  recipients: z.array(z.string().email().max(200)).max(20),
  shareConfirmed: z.boolean(),
})

const documentInputSchema = z.object({
  id: z.string().max(120).optional(),
  slotId: z.string().min(1).max(80),
  name: z.string().min(1).max(200),
  sizeBytes: z.number().int().min(0).max(10 * 1024 * 1024),
  status: z.enum(['pending', 'verified', 'needs-fix']).optional(),
  note: z.string().max(500).optional(),
  uploadedAt: z.string().max(40).optional(),
  verifiedAt: z.string().max(40).optional(),
})

export const bookingPayloadSchema = z.object({
  quote: quoteSchema,
  contact: contactSchema,
  serviceId: z.string().min(1).max(80),
  addons: addonsSchema,
  route: routeSchema,
  billing: billingSchema,
  documents: z.array(documentInputSchema).max(20),
})

export const documentUploadSchema = z.object({
  name: z.string().min(1).max(200),
  sizeBytes: z.number().int().min(0).max(10 * 1024 * 1024),
})

export const documentFixSchema = z.object({
  note: z.string().trim().min(1).max(500),
})

export const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(72),
})

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().max(200).optional(),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(72),
})

export const scenarioSchema = z.object({
  id: z.string().max(120).optional(),
  shipmentId: z.string().min(1).max(120),
  legId: z.string().min(1).max(160),
  mode: z.enum(['road', 'ocean', 'air', 'rail']),
  type: z.enum([
    'congestion',
    'accident',
    'road-closure',
    'reroute',
    'storm',
    'port-congestion',
    'security',
    'air-delay',
    'air-reschedule',
  ]),
  label: z.string().min(1).max(240),
  severity: z.enum(['low', 'medium', 'high']),
  startAt: z.string().min(1).max(40),
  endAt: z.string().min(1).max(40),
  speedFactor: z.number().min(0).max(1),
  extraWaitHours: z.number().min(0).max(720),
  detourKm: z.number().min(0).max(10000),
  center: z.object({ lat: z.number(), lng: z.number() }).optional(),
  radiusKm: z.number().min(0).max(5000),
  active: z.boolean(),
  createdAt: z.string().max(40).optional(),
})

export const scenarioToggleSchema = z.object({
  active: z.boolean(),
})

export const transportAlertsSchema = z.object({
  alerts: z
    .array(
      z.object({
        shipmentCode: z.string().min(1).max(40),
        alertId: z.string().min(1).max(160),
        legId: z.string().min(1).max(160),
        legLabel: z.string().min(1).max(240),
        title: z.string().min(1).max(240),
        detail: z.string().min(1).max(800),
        severity: z.enum(['warning', 'critical']),
        simAt: z.string().min(1).max(40),
      }),
    )
    .max(20),
})

export type BookingPayload = z.infer<typeof bookingPayloadSchema>
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>
export type ScenarioInput = z.infer<typeof scenarioSchema>
export type TransportAlertInput = z.infer<typeof transportAlertsSchema>['alerts'][number]
