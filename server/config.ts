process.env.TZ = process.env.TZ || 'Asia/Ho_Chi_Minh'

export const SESSION_COOKIE = 'vietra_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
export const isVercel = process.env.VERCEL === '1'
export const isProduction = isVercel || process.env.NODE_ENV === 'production'

export const DEMO_EMAIL = 'customer@vietra.vn'
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'VieTra@2026'
export const DEMO_NAME = 'Nguyễn Thu Hà'
export const DEMO_COMPANY = 'An Phát Logistics'

export function authSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim()
  if (secret) return secret
  if (isProduction) {
    throw new Error('AUTH_SECRET chưa được cấu hình cho môi trường production.')
  }
  return 'vietra-local-dev-secret-change-me-32-chars'
}

export function databaseUrl(): string {
  const url = process.env.TURSO_DATABASE_URL?.trim()
  if (url) return url
  if (isProduction) {
    throw new Error('TURSO_DATABASE_URL chưa được cấu hình cho môi trường production.')
  }
  return 'file:./.data/vietra.db'
}

export function databaseAuthToken(): string | undefined {
  const token = process.env.TURSO_AUTH_TOKEN?.trim()
  if (token) return token
  if (isProduction && databaseUrl().startsWith('libsql://')) {
    throw new Error('TURSO_AUTH_TOKEN chưa được cấu hình cho database Turso.')
  }
  return undefined
}

export function adminEmail(): string {
  return (process.env.ADMIN_EMAIL?.trim() || 'admin@vietra.vn').toLowerCase()
}

export function adminPassword(): string {
  const password = process.env.ADMIN_PASSWORD
  if (password) return password
  if (isProduction) {
    throw new Error('ADMIN_PASSWORD chưa được cấu hình cho tài khoản admin production.')
  }
  return 'VieTra@2026'
}
