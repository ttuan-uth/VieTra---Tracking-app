import type { IncomingMessage, ServerResponse } from 'node:http'
import { createApp } from '../server/app'

type App = ReturnType<typeof createApp>

/**
 * Single Vercel Function for the API. `vercel.json` rewrites `/api/*`
 * to `/api?path=...`; the Express app reconstructs the original URL.
 *
 * Keep the import static so Vercel bundles `server/*`, but create the app
 * inside the handler so missing configuration returns a readable JSON error.
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
