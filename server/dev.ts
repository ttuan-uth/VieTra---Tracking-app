import 'dotenv/config'
import { createApp } from './app'

const port = Number(process.env.API_PORT ?? 8787)
const app = createApp()

const server = app.listen(port, () => {
  console.log(`VieTra API đang chạy tại http://localhost:${port}/api`)
})

function shutdown(): void {
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
