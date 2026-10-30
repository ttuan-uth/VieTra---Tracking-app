import 'dotenv/config'
import { getDatabase, initDatabase } from './db'

await initDatabase(getDatabase())
console.log('Đã tạo schema và seed dữ liệu VieTra.')
