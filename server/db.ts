import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import bcrypt from 'bcryptjs'
import { createClient, type Client, type InStatement } from '@libsql/client'
import { createSeedState } from '../src/data/seed'
import type { Booking, Shipment, UserNotification } from '../src/types/domain'
import type { Scenario } from '../src/sim/types'
import {
  DEMO_COMPANY,
  DEMO_EMAIL,
  DEMO_NAME,
  DEMO_PASSWORD,
  adminEmail,
  adminPassword,
  databaseAuthToken,
  databaseUrl,
} from './config'

type SqlRow = Record<string, unknown>

let singleton: Client | null = null

function fileDirectory(url: string): string | null {
  if (!url.startsWith('file:') || url.startsWith('file::memory:')) return null
  const path = decodeURIComponent(url.slice('file:'.length).split('?')[0])
  if (!path) return null
  return dirname(resolve(path))
}

export function createDatabase(url = databaseUrl(), authToken = databaseAuthToken()): Client {
  const directory = fileDirectory(url)
  if (directory) mkdirSync(directory, { recursive: true })
  return createClient({ url, authToken })
}

export function getDatabase(): Client {
  if (!singleton) singleton = createDatabase()
  return singleton
}

const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    company TEXT,
    role TEXT NOT NULL CHECK (role IN ('customer', 'admin')),
    created_at TEXT NOT NULL
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)',
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    tracking_code TEXT,
    shipment_id TEXT,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_code ON bookings(tracking_code)',
  'CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)',
  `CREATE TABLE IF NOT EXISTS shipments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    code TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_shipments_code ON shipments(code)',
  'CREATE INDEX IF NOT EXISTS idx_shipments_user ON shipments(user_id)',
  `CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    shipment_id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  'CREATE INDEX IF NOT EXISTS idx_scenarios_user ON scenarios(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_scenarios_shipment ON scenarios(shipment_id)',
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    dedupe_key TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe ON notifications(user_id, dedupe_key)',
  'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)',
]

export async function migrateDatabase(db: Client): Promise<void> {
  await db.batch(SCHEMA.map((sql) => ({ sql })), 'write')
}

async function seedUsers(db: Client): Promise<void> {
  const statements: InStatement[] = []
  const admin = await db.execute({
    sql: 'SELECT id FROM users WHERE id = ?',
    args: ['usr-admin'],
  })
  if (admin.rows.length === 0) {
    statements.push({
      sql: 'INSERT OR IGNORE INTO users (id, email, password_hash, name, company, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [
        'usr-admin',
        adminEmail(),
        await bcrypt.hash(adminPassword(), 10),
        'Quản trị VieTra',
        'VieTra Operations',
        'admin',
        new Date().toISOString(),
      ],
    })
  }

  const customer = await db.execute({
    sql: 'SELECT id FROM users WHERE id = ?',
    args: ['usr-customer'],
  })
  if (customer.rows.length === 0) {
    statements.push({
      sql: 'INSERT OR IGNORE INTO users (id, email, password_hash, name, company, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [
        'usr-customer',
        DEMO_EMAIL,
        await bcrypt.hash(DEMO_PASSWORD, 10),
        DEMO_NAME,
        DEMO_COMPANY,
        'customer',
        new Date().toISOString(),
      ],
    })
  }

  if (statements.length > 0) await db.batch(statements, 'write')
}

export async function seedDatabase(db: Client): Promise<void> {
  await seedUsers(db)
  const seed = createSeedState()
  const statements: InStatement[] = []

  for (const booking of seed.bookings) {
    statements.push({
      sql: 'INSERT OR IGNORE INTO bookings (id, user_id, status, tracking_code, shipment_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        booking.id,
        'usr-customer',
        booking.status,
        booking.code ?? null,
        booking.shipmentId ?? null,
        JSON.stringify(booking),
        booking.createdAt,
        booking.createdAt,
      ],
    })
  }

  for (const shipment of seed.shipments) {
    statements.push({
      sql: 'INSERT OR IGNORE INTO shipments (id, user_id, code, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [
        shipment.id,
        'usr-customer',
        shipment.code,
        JSON.stringify(shipment),
        shipment.createdAt,
        shipment.createdAt,
      ],
    })
  }

  for (const scenario of seed.scenarios) {
    statements.push({
      sql: 'INSERT OR IGNORE INTO scenarios (id, user_id, shipment_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [
        scenario.id,
        'usr-customer',
        scenario.shipmentId,
        JSON.stringify(scenario),
        scenario.createdAt,
        scenario.createdAt,
      ],
    })
  }

  for (const notification of seed.notifications) {
    statements.push({
      sql: 'INSERT OR IGNORE INTO notifications (id, user_id, type, dedupe_key, read, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [
        notification.id,
        'usr-customer',
        notification.type,
        null,
        notification.read ? 1 : 0,
        JSON.stringify(notification),
        notification.createdAt,
      ],
    })
  }

  if (statements.length > 0) await db.batch(statements, 'write')
}

export async function initDatabase(db: Client): Promise<void> {
  await migrateDatabase(db)
  await seedDatabase(db)
}

export async function resetDemoData(db: Client): Promise<void> {
  await db.batch(
    [
      { sql: 'DELETE FROM notifications' },
      { sql: 'DELETE FROM scenarios' },
      { sql: 'DELETE FROM shipments' },
      { sql: 'DELETE FROM bookings' },
    ],
    'write',
  )
  await seedDatabase(db)
}

function parse<T>(value: unknown): T {
  return JSON.parse(String(value)) as T
}

export function rowToBooking(row: SqlRow): Booking {
  const data = parse<Booking>(row.data)
  return {
    ...data,
    id: String(row.id),
    ownerId: String(row.user_id),
    status: String(row.status) as Booking['status'],
    code: row.tracking_code == null ? undefined : String(row.tracking_code),
    shipmentId: row.shipment_id == null ? undefined : String(row.shipment_id),
    createdAt: String(row.created_at),
  }
}

export function rowToShipment(row: SqlRow): Shipment {
  const data = parse<Shipment>(row.data)
  return {
    ...data,
    id: String(row.id),
    code: String(row.code),
    createdAt: String(row.created_at),
  }
}

export function rowToScenario(row: SqlRow): Scenario {
  const data = parse<Scenario>(row.data)
  return { ...data, id: String(row.id) }
}

export function rowToNotification(row: SqlRow): UserNotification {
  const data = parse<UserNotification>(row.data)
  return {
    ...data,
    id: String(row.id),
    read: Number(row.read) === 1,
    createdAt: String(row.created_at),
  }
}
