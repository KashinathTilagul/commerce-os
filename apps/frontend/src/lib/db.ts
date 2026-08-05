import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import fs from 'fs'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const rawDbUrl = process.env.DATABASE_URL || ''
const isPostgres = rawDbUrl.startsWith('postgres://') || rawDbUrl.startsWith('postgresql://')

function createPrismaInstance(): PrismaClient {
  if (isPostgres) {
    return new PrismaClient({ log: ['query'] })
  }

  const dbUrl = rawDbUrl ? rawDbUrl.replace('file:', '') : (() => {
    const frontendDb = path.join(process.cwd(), 'apps', 'frontend', 'dev.db')
    if (fs.existsSync(frontendDb)) return frontendDb
    return path.join(process.cwd(), 'dev.db')
  })()

  const dbDir = path.dirname(dbUrl)
  if (dbDir && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  const adapter = new PrismaBetterSqlite3({ url: dbUrl })
  return new PrismaClient({ adapter, log: ['query'] })
}

export const db = globalForPrisma.prisma ?? createPrismaInstance()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Event log retention
const EVENT_RETENTION_DAYS = 90
const globalForCleanup = globalThis as unknown as { eventCleanupStarted?: boolean }
if (!globalForCleanup.eventCleanupStarted) {
  globalForCleanup.eventCleanupStarted = true
  const runCleanup = () => {
    const cutoff = new Date(Date.now() - EVENT_RETENTION_DAYS * 86400000)
    db.event.deleteMany({ where: { timestamp: { lt: cutoff } } }).catch(() => {})
  }
  runCleanup()
  setInterval(runCleanup, 24 * 60 * 60 * 1000)
}