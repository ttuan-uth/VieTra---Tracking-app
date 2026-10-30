import { randomUUID } from 'node:crypto'
import cookieParser from 'cookie-parser'
import express, { type NextFunction, type Request, type Response } from 'express'
import type { Client, Transaction } from '@libsql/client'
import { ZodError } from 'zod'
import { SERVICES } from '../src/data/services'
import type { AuthUser, Booking, DemoDocument, Shipment } from '../src/types/domain'
import type { Scenario } from '../src/sim/types'
import { dateTimeLabel, nowIso } from '../src/utils/date'
import {
  createSessionToken,
  clearSessionCookie,
  hashPassword,
  requireAdmin,
  requireAuth,
  setSessionCookie,
  verifyPassword,
  type AuthedRequest,
} from './auth'
import {
  bookingDocumentSlots,
  insertNotification,
  makeNotification,
  syncBookingDocuments,
} from './bookingRules'
import {
  getDatabase,
  initDatabase,
  resetDemoData,
  rowToBooking,
  rowToNotification,
  rowToScenario,
  rowToShipment,
} from './db'
import { HttpError, invalidInput, notFound, wrap } from './http'
import {
  bookingPayloadSchema,
  documentFixSchema,
  documentUploadSchema,
  loginSchema,
  registerSchema,
  scenarioSchema,
  scenarioToggleSchema,
  transportAlertsSchema,
} from './validation'

type SqlRow = Record<string, unknown>

export interface CreateAppOptions {
  db?: Client
  initialize?: boolean
}

function userOf(req: Request): AuthUser {
  return (req as AuthedRequest).user
}

function canAccess(user: AuthUser, ownerId: string): boolean {
  return user.role === 'admin' || user.id === ownerId
}

function originGuard(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next()
    return
  }
  const origin = req.headers.origin
  if (!origin) {
    next()
    return
  }
  const host = req.headers['x-forwarded-host'] ?? req.headers.host
  try {
    if (new URL(origin).host !== host) {
      res.status(403).json({
        error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Nguồn yêu cầu không hợp lệ.' },
      })
      return
    }
  } catch {
    res.status(403).json({
      error: { code: 'INVALID_ORIGIN', message: 'Origin không hợp lệ.' },
    })
    return
  }
  next()
}

export function createApp(options: CreateAppOptions = {}) {
  const db = options.db ?? getDatabase()
  const ready =
    options.initialize === false ? Promise.resolve() : initDatabase(db)
  const app = express()

  app.set('trust proxy', 1)
  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.use((req, _res, next) => {
    // On Vercel the catch-all rewrite forwards the original path in ?path=...
    // because a single function owns every /api/* route.
    const forwardedPath =
      typeof req.query.path === 'string' ? req.query.path.replace(/^\/+/, '') : null
    if (forwardedPath !== null) {
      const queryIndex = req.url.indexOf('?')
      const originalQuery = queryIndex >= 0 ? req.url.slice(queryIndex) : ''
      const cleanedQuery = originalQuery
        .replace(/([?&])path=[^&]*/g, '$1')
        .replace(/[?&]$/, '')
      req.url = `/api/${forwardedPath}${cleanedQuery}`
    } else if (!req.url.startsWith('/api')) {
      req.url = `/api${req.url}`
    }
    next()
  })

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('Vary', 'Cookie')
    next()
  })

  app.use(async (_req, _res, next) => {
    try {
      await ready
      next()
    } catch (error) {
      next(error)
    }
  })

  if (process.env.VERCEL === '1') app.use(originGuard)

  const auth = requireAuth(db)

  app.get(
    '/api/health',
    wrap(async (_req, res) => {
      await db.execute('SELECT 1')
      res.json({
        ok: true,
        database: process.env.TURSO_DATABASE_URL ? 'turso' : 'local-file',
      })
    }),
  )

  app.post(
    '/api/auth/register',
    wrap(async (req, res) => {
      const parsed = registerSchema.safeParse(req.body)
      if (!parsed.success) return invalidInput(res, parsed.error)
      const email = parsed.data.email.toLowerCase()
      const existing = await db.execute({
        sql: 'SELECT 1 FROM users WHERE email = ? LIMIT 1',
        args: [email],
      })
      if (existing.rows.length > 0) {
        throw new HttpError(409, 'EMAIL_IN_USE', 'Email này đã được đăng ký.')
      }

      const user = {
        id: `usr-${randomUUID()}`,
        email,
        name: parsed.data.name,
        company: parsed.data.company?.trim() || null,
        role: 'customer' as const,
        createdAt: new Date().toISOString(),
      }
      const passwordHash = await hashPassword(parsed.data.password)

      await db.execute({
        sql: 'INSERT INTO users (id, email, password_hash, name, company, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [
          user.id,
          user.email,
          passwordHash,
          user.name,
          user.company,
          user.role,
          user.createdAt,
        ],
      })

      const authUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company ?? null,
        role: 'customer' as const,
      }
      setSessionCookie(req, res, await createSessionToken(authUser))
      res.status(201).json({ user: authUser })
    }),
  )

  app.post(
    '/api/auth/login',
    wrap(async (req, res) => {
      const parsed = loginSchema.safeParse(req.body)
      if (!parsed.success) return invalidInput(res, parsed.error)
      const email = parsed.data.email.toLowerCase()
      const result = await db.execute({
        sql: 'SELECT id, email, name, company, role, password_hash FROM users WHERE email = ? LIMIT 1',
        args: [email],
      })
      const row = result.rows[0]
      if (!row) {
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.')
      }
      const valid = await verifyPassword(String(row.password_hash), parsed.data.password)
      if (!valid) {
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.')
      }
      const user: AuthUser = {
        id: String(row.id),
        email: String(row.email),
        name: String(row.name),
        company: row.company == null ? null : String(row.company),
        role: String(row.role) as AuthUser['role'],
      }
      setSessionCookie(req, res, await createSessionToken(user))
      res.json({ user })
    }),
  )

  app.post('/api/auth/logout', (req, res) => {
    clearSessionCookie(req, res)
    res.status(204).end()
  })

  app.get(
    '/api/auth/me',
    requireAuth(db),
    wrap((req, res) => {
      res.json({ user: sessionUser(req) })
    }),
  )

  app.get(
    '/api/state',
    auth,
    wrap(async (req, res) => {
      const user = sessionUser(req)
      const scoped = user.role !== 'admin'
      const where = scoped ? ' WHERE user_id = ?' : ''
      const args = scoped ? [user.id] : []

      const [bookings, shipments, scenarios, notifications] = await Promise.all([
        db.execute({
          sql: `SELECT * FROM bookings${where} ORDER BY created_at DESC`,
          args,
        }),
        db.execute({
          sql: `SELECT * FROM shipments${where} ORDER BY created_at DESC`,
          args,
        }),
        db.execute({
          sql: `SELECT * FROM scenarios${where} ORDER BY created_at DESC`,
          args,
        }),
        db.execute({
          sql: 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
          args: [user.id],
        }),
      ])

      res.json({
        bookings: bookings.rows.map((row) => rowToBooking(asRow(row))),
        shipments: shipments.rows.map((row) => rowToShipment(asRow(row))),
        scenarios: scenarios.rows.map((row) => rowToScenario(asRow(row))),
        notifications: notifications.rows.map((row) => rowToNotification(asRow(row))),
      })
    }),
  )

  app.post(
    '/api/bookings',
    auth,
    wrap(async (req, res) => {
      const parsed = bookingPayloadSchema.safeParse(req.body)
      if (!parsed.success) return invalidInput(res, parsed.error)
      if (!SERVICES.some((service) => service.id === parsed.data.serviceId)) {
        throw new HttpError(400, 'UNKNOWN_SERVICE', 'Dịch vụ vận chuyển không hợp lệ.')
      }

      const user = userOf(req)
      const bookingId = `bk-${randomUUID()}`
      const createdAt = nowIso()
      const base: Booking = {
        id: bookingId,
        status: 'awaiting-documents',
        createdAt,
        quote: parsed.data.quote,
        contact: parsed.data.contact,
        serviceId: parsed.data.serviceId,
        addons: parsed.data.addons,
        route: parsed.data.route,
        billing: parsed.data.billing,
        documents: [],
        ownerId: user.id,
      }
      const slots = bookingDocumentSlots(base)
      const validSlots = new Set(slots.map((slot) => slot.id))
      const documents: DemoDocument[] = parsed.data.documents.map((document) => {
        if (!validSlots.has(document.slotId)) {
          throw new HttpError(
            400,
            'UNKNOWN_DOCUMENT_SLOT',
            `Mục chứng từ "${document.slotId}" không thuộc hồ sơ này.`,
          )
        }
        return {
          id: `doc-${randomUUID()}-${document.slotId}`,
          slotId: document.slotId,
          name: document.name,
          sizeBytes: document.sizeBytes,
          status: 'pending',
          uploadedAt: document.uploadedAt ?? createdAt,
        }
      })

      const booking: Booking = {
        ...base,
        documents,
      }

      await db.execute({
        sql: 'INSERT INTO bookings (id, user_id, status, tracking_code, shipment_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          booking.id,
          user.id,
          booking.status,
          null,
          null,
          JSON.stringify(booking),
          booking.createdAt,
          booking.createdAt,
        ],
      })
      res.status(201).json(booking)
    }),
  )

  app.get(
    '/api/bookings/:id',
    auth,
    wrap(async (req, res) => {
      const row = await bookingRow(db, req.params.id)
      if (!row) return notFound(res, 'Không tìm thấy đơn đặt chỗ.')
      const booking = rowToBooking(row)
      if (!canAccess(userOf(req), String(row.user_id))) {
        return notFound(res, 'Không tìm thấy đơn đặt chỗ.')
      }
      res.json(booking)
    }),
  )

  app.post(
    '/api/bookings/:id/documents/:slotId',
    auth,
    wrap(async (req, res) => {
      const parsed = documentUploadSchema.safeParse(req.body)
      if (!parsed.success) return invalidInput(res, parsed.error)
      const user = userOf(req)
      const result = await withTransaction(db, async (tx) => {
        const row = await bookingRow(tx, req.params.id)
        if (!row) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy đơn đặt chỗ.')
        if (String(row.user_id) !== user.id) {
          throw new HttpError(403, 'FORBIDDEN', 'Bạn không sở hữu đơn đặt chỗ này.')
        }
        const booking = rowToBooking(row)
        if (booking.code) {
          throw new HttpError(409, 'CODE_ISSUED', 'Hồ sơ đã cấp mã nên không thể thay chứng từ.')
        }
        const slotExists = bookingDocumentSlots(booking).some(
          (slot) => slot.id === req.params.slotId,
        )
        if (!slotExists) {
          throw new HttpError(400, 'UNKNOWN_DOCUMENT_SLOT', 'Mục chứng từ không hợp lệ.')
        }
        const existing = booking.documents.find(
          (document) => document.slotId === req.params.slotId,
        )
        const nextDocument: DemoDocument = {
          id: existing?.id ?? `doc-${randomUUID()}-${req.params.slotId}`,
          slotId: req.params.slotId,
          name: parsed.data.name,
          sizeBytes: parsed.data.sizeBytes,
          status: 'pending',
          uploadedAt: nowIso(),
        }
        const documents = existing
          ? booking.documents.map((document) =>
              document.slotId === req.params.slotId ? nextDocument : document,
            )
          : [...booking.documents, nextDocument]
        const synced = await syncBookingDocuments(
          tx,
          booking,
          documents,
          String(row.user_id),
        )
        return synced.booking
      })
      res.json(result)
    }),
  )

  app.post(
    '/api/bookings/:id/documents/:documentId/verify',
    auth,
    requireAdmin,
    wrap(async (req, res) => {
      const result = await withTransaction(db, async (tx) => {
        const row = await bookingRow(tx, req.params.id)
        if (!row) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy đơn đặt chỗ.')
        const booking = rowToBooking(row)
        if (booking.code) {
          throw new HttpError(409, 'CODE_ISSUED', 'Hồ sơ đã cấp mã nên không thể xác minh thêm.')
        }
        const document = booking.documents.find((item) => item.id === req.params.documentId)
        if (!document) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy chứng từ.')
        const documents = booking.documents.map((item) =>
          item.id === document.id
            ? {
                ...item,
                status: 'verified' as const,
                verifiedAt: nowIso(),
                note: undefined,
              }
            : item,
        )
        const synced = await syncBookingDocuments(
          tx,
          booking,
          documents,
          String(row.user_id),
        )
        return synced.booking
      })
      res.json(result)
    }),
  )

  app.post(
    '/api/bookings/:id/documents/:documentId/request-fix',
    auth,
    requireAdmin,
    wrap(async (req, res) => {
      const parsed = documentFixSchema.safeParse(req.body)
      if (!parsed.success) return invalidInput(res, parsed.error)
      const result = await withTransaction(db, async (tx) => {
        const row = await bookingRow(tx, req.params.id)
        if (!row) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy đơn đặt chỗ.')
        const booking = rowToBooking(row)
        if (booking.code) {
          throw new HttpError(409, 'CODE_ISSUED', 'Hồ sơ đã cấp mã nên không thể yêu cầu bổ sung.')
        }
        const document = booking.documents.find((item) => item.id === req.params.documentId)
        if (!document) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy chứng từ.')
        const documents = booking.documents.map((item) =>
          item.id === document.id
            ? {
                ...item,
                status: 'needs-fix' as const,
                note: parsed.data.note,
                verifiedAt: undefined,
              }
            : item,
        )
        const synced = await syncBookingDocuments(
          tx,
          booking,
          documents,
          String(row.user_id),
        )
        const slot = bookingDocumentSlots(booking).find(
          (item) => item.id === document.slotId,
        )
        const notification = makeNotification({
          type: 'document-fix',
          title: `Cần bổ sung: ${slot?.label ?? document.name}`,
          detail: parsed.data.note,
          bookingId: booking.id,
        })
        await insertNotification(tx, String(row.user_id), notification)
        return synced.booking
      })
      res.json(result)
    }),
  )

  app.post(
    '/api/shipments/:id/handover',
    auth,
    wrap(async (req, res) => {
      const user = userOf(req)
      const result = await withTransaction(db, async (tx) => {
        const row = await shipmentRowById(tx, req.params.id)
        if (!row) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy lô hàng.')
        if (!canAccess(user, String(row.user_id))) {
          throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy lô hàng.')
        }
        const shipment = rowToShipment(row)
        if (shipment.handoverConfirmedAt) return shipment
        const next: Shipment = {
          ...shipment,
          handoverConfirmedAt: shipment.handoverAt,
          status: 'in-transit',
        }
        await tx.execute({
          sql: 'UPDATE shipments SET data = ?, updated_at = ? WHERE id = ?',
          args: [JSON.stringify(next), nowIso(), next.id],
        })
        await insertNotification(
          tx,
          String(row.user_id),
          makeNotification({
            type: 'handover',
            title: `Đã bàn giao tự động · ${next.code}`,
            detail: `${
              next.handoff === 'deliver-to-warehouse'
                ? 'Hàng đã được xác nhận vào kho'
                : 'Xe đã lấy hàng'
            } lúc ${dateTimeLabel(next.handoverAt)} theo giờ mô phỏng.`,
            shipmentCode: next.code,
          }),
        )
        return next
      })
      res.json(result)
    }),
  )

  app.get(
    '/api/shipments/:code',
    auth,
    wrap(async (req, res) => {
      const row = await shipmentRowByCode(db, req.params.code)
      if (!row) return notFound(res, 'Không tìm thấy mã vận tải.')
      if (!canAccess(userOf(req), String(row.user_id))) {
        return notFound(res, 'Không tìm thấy mã vận tải.')
      }
      res.json(rowToShipment(row))
    }),
  )

  app.post(
    '/api/scenarios',
    auth,
    wrap(async (req, res) => {
      const parsed = scenarioSchema.safeParse(req.body)
      if (!parsed.success) return invalidInput(res, parsed.error)
      const shipmentRow = await shipmentRowById(db, parsed.data.shipmentId)
      if (!shipmentRow) return notFound(res, 'Không tìm thấy lô hàng.')
      if (!canAccess(userOf(req), String(shipmentRow.user_id))) {
        return notFound(res, 'Không tìm thấy lô hàng.')
      }
      const scenario: Scenario = {
        ...parsed.data,
        id: `sc-${randomUUID()}`,
        shipmentId: String(shipmentRow.id),
        createdAt: nowIso(),
      }
      await db.execute({
        sql: 'INSERT INTO scenarios (id, user_id, shipment_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [
          scenario.id,
          String(shipmentRow.user_id),
          scenario.shipmentId,
          JSON.stringify(scenario),
          scenario.createdAt,
          scenario.createdAt,
        ],
      })
      res.status(201).json(scenario)
    }),
  )

  app.patch(
    '/api/scenarios/:id',
    auth,
    wrap(async (req, res) => {
      const parsed = scenarioSchema.safeParse(req.body)
      if (!parsed.success) return invalidInput(res, parsed.error)
      const row = await scenarioRow(db, req.params.id)
      if (!row) return notFound(res, 'Không tìm thấy tình huống.')
      const existing = rowToScenario(row)
      const shipmentRow = await shipmentRowById(db, existing.shipmentId)
      if (!shipmentRow) return notFound(res, 'Không tìm thấy lô hàng.')
      if (!canAccess(userOf(req), String(shipmentRow.user_id))) {
        return notFound(res, 'Không tìm thấy tình huống.')
      }
      const scenario: Scenario = {
        ...existing,
        ...parsed.data,
        id: existing.id,
        shipmentId: existing.shipmentId,
        createdAt: existing.createdAt,
      }
      await db.execute({
        sql: 'UPDATE scenarios SET data = ?, updated_at = ? WHERE id = ?',
        args: [JSON.stringify(scenario), nowIso(), scenario.id],
      })
      res.json(scenario)
    }),
  )

  app.post(
    '/api/scenarios/:id/toggle',
    auth,
    wrap(async (req, res) => {
      const parsed = scenarioToggleSchema.safeParse(req.body)
      if (!parsed.success) return invalidInput(res, parsed.error)
      const row = await scenarioRow(db, req.params.id)
      if (!row) return notFound(res, 'Không tìm thấy tình huống.')
      const existing = rowToScenario(row)
      const shipmentRow = await shipmentRowById(db, existing.shipmentId)
      if (!shipmentRow) return notFound(res, 'Không tìm thấy lô hàng.')
      if (!canAccess(userOf(req), String(shipmentRow.user_id))) {
        return notFound(res, 'Không tìm thấy tình huống.')
      }
      const scenario: Scenario = { ...existing, active: parsed.data.active }
      await db.execute({
        sql: 'UPDATE scenarios SET data = ?, updated_at = ? WHERE id = ?',
        args: [JSON.stringify(scenario), nowIso(), scenario.id],
      })
      res.json(scenario)
    }),
  )

  app.delete(
    '/api/scenarios/:id',
    auth,
    wrap(async (req, res) => {
      const row = await scenarioRow(db, req.params.id)
      if (!row) return notFound(res, 'Không tìm thấy tình huống.')
      const existing = rowToScenario(row)
      const shipmentRow = await shipmentRowById(db, existing.shipmentId)
      if (!shipmentRow) return notFound(res, 'Không tìm thấy lô hàng.')
      if (!canAccess(userOf(req), String(shipmentRow.user_id))) {
        return notFound(res, 'Không tìm thấy tình huống.')
      }
      await db.execute({
        sql: 'DELETE FROM scenarios WHERE id = ?',
        args: [existing.id],
      })
      res.status(204).end()
    }),
  )

  app.post(
    '/api/notifications/transport-alert',
    auth,
    wrap(async (req, res) => {
      const parsed = transportAlertsSchema.safeParse(req.body)
      if (!parsed.success) return invalidInput(res, parsed.error)
      const user = userOf(req)
      let created = 0
      for (const alert of parsed.data.alerts) {
        const row = await shipmentRowByCode(db, alert.shipmentCode)
        if (!row || !canAccess(user, String(row.user_id))) continue
        const notification = makeNotification({
          type: 'transport-alert',
          title: alert.title,
          detail: alert.detail,
          shipmentCode: alert.shipmentCode.toUpperCase(),
          severity: alert.severity,
          legId: alert.legId,
          legLabel: alert.legLabel,
          alertId: alert.alertId,
          simAt: alert.simAt,
        })
        const inserted = await insertNotification(
          db,
          user.id,
          notification,
          `${alert.shipmentCode.toUpperCase()}::${alert.alertId}`,
        )
        if (inserted) created += 1
      }
      res.json({ created })
    }),
  )

  app.patch(
    '/api/notifications/:id/read',
    auth,
    wrap(async (req, res) => {
      const user = userOf(req)
      const result = await db.execute({
        sql: 'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?',
        args: [req.params.id, user.id],
      })
      if (result.rowsAffected === 0) return notFound(res, 'Không tìm thấy thông báo.')
      res.status(204).end()
    }),
  )

  app.post(
    '/api/notifications/read-all',
    auth,
    wrap(async (req, res) => {
      await db.execute({
        sql: 'UPDATE notifications SET read = 1 WHERE user_id = ?',
        args: [userOf(req).id],
      })
      res.status(204).end()
    }),
  )

  app.post(
    '/api/demo/reset',
    auth,
    requireAdmin,
    wrap(async (_req, res) => {
      await resetDemoData(db)
      res.json({ ok: true })
    }),
  )

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API không tồn tại.' } })
  })

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return
    if (error instanceof ZodError) {
      invalidInput(res, error)
      return
    }
    if (error instanceof HttpError) {
      res.status(error.status).json({
        error: { code: error.code, message: error.message },
      })
      return
    }
    console.error(error)
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Máy chủ gặp lỗi khi xử lý yêu cầu.' },
    })
  })

  return app
}

function sessionUser(req: Request): AuthUser {
  return (req as AuthedRequest).user
}

function asRow(row: unknown): SqlRow {
  return row as SqlRow
}

async function bookingRow(
  db: Client | Transaction,
  id: string,
): Promise<SqlRow | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM bookings WHERE id = ? LIMIT 1',
    args: [id],
  })
  return result.rows[0] ? asRow(result.rows[0]) : null
}

async function shipmentRowById(
  db: Client | Transaction,
  id: string,
): Promise<SqlRow | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM shipments WHERE id = ? LIMIT 1',
    args: [id],
  })
  return result.rows[0] ? asRow(result.rows[0]) : null
}

async function shipmentRowByCode(
  db: Client | Transaction,
  code: string,
): Promise<SqlRow | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM shipments WHERE code = ? LIMIT 1',
    args: [code.toUpperCase()],
  })
  return result.rows[0] ? asRow(result.rows[0]) : null
}

async function scenarioRow(
  db: Client,
  id: string,
): Promise<SqlRow | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM scenarios WHERE id = ? LIMIT 1',
    args: [id],
  })
  return result.rows[0] ? asRow(result.rows[0]) : null
}

async function withTransaction<T>(
  db: Client,
  run: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const tx = await db.transaction('write')
  try {
    const result = await run(tx)
    await tx.commit()
    return result
  } catch (error) {
    await tx.rollback()
    throw error
  }
}


