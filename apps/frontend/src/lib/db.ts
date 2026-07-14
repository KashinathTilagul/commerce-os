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

const sqlite = new Database(dbUrl)
const adapter = new PrismaBetterSqlite3(sqlite)

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db