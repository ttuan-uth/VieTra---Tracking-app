import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import type { NextFunction, Request, Response } from 'express'
import type { Client } from '@libsql/client'
import type { AuthUser, UserRole } from '../src/types/domain'
import { SESSION_COOKIE, SESSION_TTL_SECONDS, authSecret } from './config'

export interface AuthedRequest extends Request {
  user: AuthUser
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(authSecret())
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    role: user.role,
    email: user.email,
    name: user.name,
    company: user.company,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setIssuer('vietra')
    .setAudience('vietra-web')
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey())
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https'
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000,
  })
}

export function clearSessionCookie(req: Request, res: Response): void {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https'
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
  })
}

function toAuthUser(row: Record<string, unknown>): AuthUser {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    company: row.company == null ? null : String(row.company),
    role: String(row.role) as UserRole,
  }
}

export async function readSessionUser(req: Request, db: Client): Promise<AuthUser | null> {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: 'vietra',
      audience: 'vietra-web',
    })
    if (!payload.sub) return null
    const result = await db.execute({
      sql: 'SELECT id, email, name, company, role FROM users WHERE id = ?',
      args: [payload.sub],
    })
    const row = result.rows[0]
    if (!row) return null
    return toAuthUser(row as unknown as Record<string, unknown>)
  } catch {
    return null
  }
}

export function requireAuth(db: Client) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = await readSessionUser(req, db)
    if (!user) {
      res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' },
      })
      return
    }
    ;(req as AuthedRequest).user = user
    next()
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthedRequest).user
  if (!user || user.role !== 'admin') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Chỉ tài khoản admin được thực hiện thao tác này.' },
    })
    return
  }
  next()
}

export function authUser(row: Record<string, unknown>): AuthUser {
  return toAuthUser(row)
}
