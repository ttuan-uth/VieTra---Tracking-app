import type { IncomingMessage, ServerResponse } from 'node:http'
import { createApp } from '../server/app'

const app = createApp()

/**
 * Single Vercel Function for the API. `vercel.json` rewrites `/api/:path*`
 * to `/api?path=:path*`; the Express app reconstructs the original URL.
 */
export default function handler(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  app(
    req as unknown as Parameters<typeof app>[0],
    res as unknown as Parameters<typeof app>[1],
  )
}
