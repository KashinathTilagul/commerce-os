import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:dVyyDQ6X2oWBQzR3@db.guxaxhofeglqkmrhahsw.supabase.co:5432/postgres'
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

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