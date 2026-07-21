import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import Database from 'better-sqlite3'


const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// In Next.js, process.cwd() is the project root (apps/frontend)
const dbUrl = process.env.DATABASE_URL?.replace('file:', '') || './dev.db'

// Ensure directory exists for better-sqlite3
import fs from 'fs'
import path from 'path'
const dbDir = path.dirname(dbUrl)
if (dbDir && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const adapter = new PrismaBetterSqlite3({ url: dbUrl })

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Event log retention — without this, Event rows (which can contain up to a
// few hundred characters of chat/conversation content) grow forever; the
// only prior cleanup path was full account deletion. This is a long-running
// Node server (next start, not serverless), so a module-scope interval
// persists for the process lifetime, same pattern as the rate-limit cleanup
// in lib/security.ts.
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