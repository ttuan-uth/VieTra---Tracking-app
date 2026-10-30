import { randomInt, randomUUID } from 'node:crypto'
import type { Client, Transaction } from '@libsql/client'
import { buildShipment } from '../src/data/routes'
import { SPECIAL_CARGO, serviceById } from '../src/data/services'
import { documentState, requiredDocumentSlots } from '../src/features/bookings/documents'
import type {
  Booking,
  BookingStatus,
  DemoDocument,
  Shipment,
  UserNotification,
} from '../src/types/domain'
import { addDays, addHours, nowIso } from '../src/utils/date'
import { totalVolume, totalWeight } from '../src/utils/format'

export type SqlWriter = Client | Transaction

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function bookingDocumentSlots(booking: Booking) {
  const service = serviceById(booking.serviceId)
  return requiredDocumentSlots({
    mode: service.mode,
    specialTypes: booking.quote.specialTypes,
    cargoInsurance: booking.addons.cargoInsurance,
  })
}

function cargoSummaryFor(booking: Booking): string {
  const count = booking.quote.lines.reduce((sum, line) => sum + line.quantity, 0)
  return `${count} kiện · ${totalVolume(booking.quote.lines).toFixed(1).replace('.', ',')} m³ · ${Math.round(totalWeight(booking.quote.lines)).toLocaleString('vi-VN')} kg`
}

export function buildShipmentForBooking(
  booking: Booking,
  code: string,
  shipmentId = `shp-${randomUUID()}`,
): Shipment {
  const service = serviceById(booking.serviceId)
  const startAt = booking.route.pickupDate || addDays(nowIso(), 2)
  const handoverAt = addHours(
    startAt,
    booking.quote.handoff === 'deliver-to-warehouse' ? -6 : -2,
  )
  const special = booking.quote.specialTypes
    .map((id) => SPECIAL_CARGO.find((item) => item.id === id)?.label)
    .filter((label): label is string => Boolean(label))

  return buildShipment({
    id: shipmentId,
    code,
    customer: booking.contact.companyName || booking.contact.fullName,
    serviceName: service.name,
    mode: service.mode,
    handoff: booking.quote.handoff,
    startAt,
    handoverAt,
    handoverConfirmedAt: null,
    status: 'awaiting-handover',
    cargoSummary: cargoSummaryFor(booking),
    specialCargo: special,
    vehicleName: 'Xe tải 8T — đội Miền Bắc',
    vehiclePlate: '15C-228.14',
  })
}

export async function createTrackingCode(db: SqlWriter): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const suffix = Array.from(
      { length: 6 },
      () => CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)],
    ).join('')
    const code = `VIE${suffix}`
    const result = await db.execute({
      sql: 'SELECT 1 FROM shipments WHERE code = ? LIMIT 1',
      args: [code],
    })
    if (result.rows.length === 0) return code
  }
  throw new Error('Không tạo được mã vận tải duy nhất.')
}

export function makeNotification(
  input: Omit<UserNotification, 'id' | 'createdAt' | 'read'>,
): UserNotification {
  return {
    ...input,
    id: `notif-${randomUUID()}`,
    createdAt: nowIso(),
    read: false,
  }
}

export async function insertNotification(
  db: SqlWriter,
  userId: string,
  notification: UserNotification,
  dedupeKey: string | null = null,
): Promise<boolean> {
  const result = await db.execute({
    sql: 'INSERT OR IGNORE INTO notifications (id, user_id, type, dedupe_key, read, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [
      notification.id,
      userId,
      notification.type,
      dedupeKey,
      notification.read ? 1 : 0,
      JSON.stringify(notification),
      notification.createdAt,
    ],
  })
  return result.rowsAffected > 0
}

async function insertShipment(
  db: SqlWriter,
  ownerId: string,
  shipment: Shipment,
): Promise<void> {
  await db.execute({
    sql: 'INSERT INTO shipments (id, user_id, code, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [
      shipment.id,
      ownerId,
      shipment.code,
      JSON.stringify(shipment),
      shipment.createdAt,
      nowIso(),
    ],
  })
}

export async function updateBooking(db: SqlWriter, booking: Booking): Promise<void> {
  await db.execute({
    sql: 'UPDATE bookings SET status = ?, tracking_code = ?, shipment_id = ?, data = ?, updated_at = ? WHERE id = ?',
    args: [
      booking.status,
      booking.code ?? null,
      booking.shipmentId ?? null,
      JSON.stringify(booking),
      nowIso(),
      booking.id,
    ],
  })
}

export interface SyncResult {
  booking: Booking
  shipment?: Shipment
  notifications: UserNotification[]
}

/**
 * Recomputes booking status after a document change and issues the tracking code
 * exactly once. The caller owns the transaction so code issuance and document
 * verification commit together.
 */
export async function syncBookingDocuments(
  db: SqlWriter,
  booking: Booking,
  documents: DemoDocument[],
  ownerId: string,
): Promise<SyncResult> {
  const next: Booking = { ...booking, documents, ownerId }
  if (next.code) return { booking: next, notifications: [] }

  const state = documentState(documents, bookingDocumentSlots(next))
  const notifications: UserNotification[] = []
  let shipment: Shipment | undefined

  if (state.ready) {
    const code = await createTrackingCode(db)
    shipment = buildShipmentForBooking(next, code)
    next.status = 'confirmed'
    next.code = code
    next.shipmentId = shipment.id
    await insertShipment(db, ownerId, shipment)
    const service = serviceById(next.serviceId)
    notifications.push(
      makeNotification({
        type: 'code-issued',
        title: `Đã cấp mã ${code}`,
        detail: `${service.name} · ${next.quote.pickup.city} → ${next.quote.delivery.city}. Mở Theo dõi để xem lô hàng.`,
        bookingId: next.id,
        shipmentCode: code,
      }),
    )
  } else {
    const status: BookingStatus =
      state.needsFix.length > 0 || state.missing.length > 0
        ? 'needs-docs'
        : 'awaiting-documents'
    next.status = status
  }

  await updateBooking(db, next)
  for (const notification of notifications) {
    await insertNotification(db, ownerId, notification)
  }

  return { booking: next, shipment, notifications }
}
