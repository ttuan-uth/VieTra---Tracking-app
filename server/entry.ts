import type { IncomingMessage, ServerResponse } from 'node:http'
import { createApp } from './app'

type App = ReturnType<typeof createApp>

/**
 * Vercel Function entry. `npm run build:api` bundles this file into
 * `api/index.js`, so Vercel does not have to resolve imports outside `api/`.
 */
let app: App | null = null

function getApp(): App {
  if (!app) app = createApp()
  return app
}

export default function handler(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  try {
    getApp()(
      req as unknown as Parameters<App>[0],
      res as unknown as Parameters<App>[1],
    )
  } catch (error) {
    console.error(error)
    if (res.headersSent) return
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Không khởi tạo được API.'
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.end(JSON.stringify({ error: { code: 'API_INIT_FAILED', message } }))
  }
}
