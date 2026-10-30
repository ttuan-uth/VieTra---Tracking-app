import { existsSync, readdirSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'

function list(path: string): string[] {
  try {
    return readdirSync(path).slice(0, 40)
  } catch {
    return []
  }
}

export default function handler(
  _req: IncomingMessage,
  res: ServerResponse,
): void {
  const root = '/var/task'
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store')
  res.end(
    JSON.stringify({
      root: list(root),
      api: list(`${root}/api`),
      serverExists: existsSync(`${root}/server`),
      server: list(`${root}/server`),
      serverAppTs: existsSync(`${root}/server/app.ts`),
      serverAppJs: existsSync(`${root}/server/app.js`),
      srcExists: existsSync(`${root}/src`),
      nodeModulesExists: existsSync(`${root}/node_modules`),
    }),
  )
}
