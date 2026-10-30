import type { IncomingMessage, ServerResponse } from 'node:http'
import type { createApp } from '../server/app'

type App = ReturnType<typeof createApp>

/**
 * Single Vercel Function for the API. `vercel.json` rewrites `/api/*`
 * to `/api?path=...`; the Express app reconstructs the original URL.
 *
 * Load the app lazily so missing production configuration produces a
 * readable JSON error instead of Vercel's generic FUNCTION_INVOCATION_FAILED.
 */
let appPromise: Promise<App> | null = null

function getApp(): Promise<App> {
  if (!appPromise) {
    appPromise = import('../server/app')
      .then(({ createApp: create }) => create())
      .catch((error: unknown) => {
        appPromise = null
        throw error
      })
  }
  return appPromise
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const app = await getApp()
    app(
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
