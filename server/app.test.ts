import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Client } from '@libsql/client'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from './app'
import { createDatabase, migrateDatabase, seedDatabase } from './db'

let db: Client
let dir: string
let app: ReturnType<typeof createApp>

const ADMIN = { email: 'admin@vietra.vn', password: 'VieTra@2026' }
const CUSTOMER = { email: 'customer@vietra.vn', password: 'VieTra@2026' }

function bookingPayload() {
  const pickup = {
    countryCode: 'VN',
    search: 'Lô C2, Khu công nghiệp Quế Võ',
    street: 'Lô C2, Khu công nghiệp Quế Võ',
    postalCode: '220000',
    city: 'Bắc Ninh',
  }
  const delivery = {
    countryCode: 'DE',
    search: 'Bei den St. Pauli-Landungsbrücken 1',
    street: 'Bei den St. Pauli-Landungsbrücken 1',
    postalCode: '20359',
    city: 'Hamburg',
  }
  return {
    quote: {
      handoff: 'carrier-pickup',
      pickup,
      delivery,
      freightTerm: 'prepaid',
      cargoType: 'lcl',
      unitSystem: 'metric',
      lines: [
        {
          id: 'line-1',
          packageType: 'carton',
          quantity: 2,
          weightKg: 80,
          lengthCm: 100,
          widthCm: 80,
          heightCm: 60,
        },
      ],
      containerId: 'lcl',
      handling: 'general',
      specialTypes: [],
      customerType: 'business',
      companyName: 'Công ty Kiểm thử',
      contactName: 'Người Kiểm Thử',
      email: 'test@example.com',
      phone: '0900000000',
      marketingOptIn: false,
      termsAccepted: true,
    },
    contact: {
      customerType: 'business',
      companyName: 'Công ty Kiểm thử',
      fullName: 'Người Kiểm Thử',
      email: 'test@example.com',
      phone: '0900000000',
      marketingOptIn: false,
      termsAccepted: true,
    },
    serviceId: 'sea-lcl',
    addons: {
      exportCustoms: false,
      importCustoms: false,
      declarationLines: 0,
      cargoInsurance: false,
      insuredValue: 0,
      insuredCurrency: 'VND',
      sustainability: 'none',
      incoterm: 'FOB',
    },
    route: {
      shipperSameAsPickup: true,
      consigneeSameAsDelivery: true,
      shipperAddress: pickup,
      consigneeAddress: delivery,
      pickupDate: '2026-11-05',
    },
    billing: {
      companyName: 'Công ty Kiểm thử',
      reference: 'PO-001',
      invoiceEmail: 'billing@example.com',
      taxId: '',
      addressMode: 'shipper',
      billingCompanyName: 'Công ty Kiểm thử',
      billingStreet: '',
      billingCity: '',
      billingState: '',
      billingPostalCode: '',
      billingCountry: 'VN',
      recipients: [],
      shareConfirmed: false,
    },
    documents: [
      { slotId: 'invoice', name: 'invoice.pdf', sizeBytes: 1200 },
      { slotId: 'packing', name: 'packing.pdf', sizeBytes: 1400 },
      { slotId: 'transport', name: 'bill-of-lading.pdf', sizeBytes: 1800 },
    ],
  }
}

beforeAll(async () => {
  process.env.AUTH_SECRET = 'vietra-test-secret-at-least-32-characters'
  process.env.ADMIN_PASSWORD = 'VieTra@2026'
  dir = mkdtempSync(join(tmpdir(), 'vietra-api-'))
  db = createDatabase(`file:${join(dir, 'test.db').replace(/\\/g, '/')}`)
  await migrateDatabase(db)
  await seedDatabase(db)
  app = createApp({ db, initialize: false })
})

afterAll(() => {
  db.close()
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch {
    // Windows can keep a brief handle on the libSQL file after close.
  }
})

describe('VieTra API', () => {
  it('logs in the seeded customer and scopes their state', async () => {
    const agent = request.agent(app)
    const login = await agent.post('/api/auth/login').send(CUSTOMER).expect(200)
    expect(login.body.user.role).toBe('customer')

    const state = await agent.get('/api/state').expect(200)
    expect(state.body.bookings.length).toBeGreaterThan(0)
    expect(state.body.shipments.map((item: { code: string }) => item.code)).toContain(
      'VIE7K2M4A',
    )
    expect(state.body.notifications.length).toBeGreaterThan(0)
  })

  it('rejects unauthenticated state access', async () => {
    await request(app).get('/api/state').expect(401)
  })

  it('lets a customer create a booking and blocks document verification', async () => {
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send(CUSTOMER).expect(200)

    const created = await agent.post('/api/bookings').send(bookingPayload()).expect(201)
    expect(created.body.code).toBeUndefined()
    expect(created.body.documents).toHaveLength(3)

    const documentId = created.body.documents[0].id
    await agent
      .post(`/api/bookings/${created.body.id}/documents/${documentId}/verify`)
      .send({})
      .expect(403)
  })

  it('issues a unique tracking code only after every document is verified', async () => {
    const customer = request.agent(app)
    const admin = request.agent(app)
    await customer.post('/api/auth/login').send(CUSTOMER).expect(200)
    await admin.post('/api/auth/login').send(ADMIN).expect(200)

    const created = await customer.post('/api/bookings').send(bookingPayload()).expect(201)
    const bookingId = created.body.id as string

    for (const document of created.body.documents as Array<{ id: string }>) {
      await admin
        .post(`/api/bookings/${bookingId}/documents/${document.id}/verify`)
        .send({})
        .expect(200)
    }

    const state = await customer.get('/api/state').expect(200)
    const booking = state.body.bookings.find((item: { id: string }) => item.id === bookingId)
    expect(booking.code).toMatch(/^VIE[A-Z0-9]{6}$/)
    expect(booking.status).toBe('confirmed')

    const issuance = state.body.notifications.find(
      (item: { type: string; bookingId?: string }) =>
        item.type === 'code-issued' && item.bookingId === bookingId,
    )
    expect(issuance).toBeTruthy()
  })

  it('keeps newly registered customers isolated from seeded bookings', async () => {
    const agent = request.agent(app)
    const email = `new-${Date.now()}@example.com`
    const registered = await agent
      .post('/api/auth/register')
      .send({ name: 'Khách Mới', company: 'Công ty Mới', email, password: 'MatKhau123!' })
      .expect(201)
    expect(registered.body.user.role).toBe('customer')

    const state = await agent.get('/api/state').expect(200)
    expect(state.body.bookings).toHaveLength(0)
    expect(state.body.shipments).toHaveLength(0)
  })

  it('deduplicates transport-alert notifications on the server', async () => {
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send(CUSTOMER).expect(200)

    const alert = {
      shipmentCode: 'VIE7K2M4A',
      alertId: 'alert-test-dedupe',
      legId: 'shp-ocean-1-leg-1',
      legLabel: 'Chặng nội địa Việt Nam',
      title: 'Kiểm thử cảnh báo',
      detail: 'Cảnh báo kiểm thử chỉ được tạo một lần.',
      severity: 'warning',
      simAt: new Date().toISOString(),
    }

    const first = await agent
      .post('/api/notifications/transport-alert')
      .send({ alerts: [alert] })
      .expect(200)
    expect(first.body.created).toBe(1)

    const second = await agent
      .post('/api/notifications/transport-alert')
      .send({ alerts: [alert] })
      .expect(200)
    expect(second.body.created).toBe(0)
  })

  it('creates and toggles a scenario for the shipment owner', async () => {
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send(CUSTOMER).expect(200)

    const state = await agent.get('/api/state').expect(200)
    const shipment = state.body.shipments[0] as { id: string; code: string }
    const scenario = {
      shipmentId: shipment.id,
      legId: `${shipment.id}-leg-1`,
      mode: 'road',
      type: 'congestion',
      label: 'Kiểm thử ùn tắc',
      severity: 'medium',
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 3_600_000).toISOString(),
      speedFactor: 0.5,
      extraWaitHours: 0,
      detourKm: 0,
      radiusKm: 30,
      active: true,
    }
    const created = await agent.post('/api/scenarios').send(scenario).expect(201)
    expect(created.body.id).toMatch(/^sc-/)

    const toggled = await agent
      .post(`/api/scenarios/${created.body.id}/toggle`)
      .send({ active: false })
      .expect(200)
    expect(toggled.body.active).toBe(false)

    await agent.delete(`/api/scenarios/${created.body.id}`).expect(204)
  })
})
