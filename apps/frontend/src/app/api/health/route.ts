export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { storageRoot } from '@/lib/storage'
import fs from 'fs'
import path from 'path'

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  services: {
    database: { status: string; latency: number; poolSize?: number }
    storage: { status: string; latency: number; diskUsage?: string }
    kernel: { status: string; latency: number }
    redis?: { status: string; latency: number }
  }
  system: {
    uptime: number
    memory: NodeJS.MemoryUsage
    timestamp: string
  }
  latencyMs: number
}

export async function GET() {
  const start = Date.now()
  const releaseVersion = process.env.RELEASE_VERSION
    || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
    || 'development'

  const results: HealthCheckResult = {
    status: 'healthy',
    version: releaseVersion,
    services: {
      database: { status: 'unknown', latency: 0 },
      storage: { status: 'unknown', latency: 0 },
      kernel: { status: 'unknown', latency: 0 },
    },
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    },
    latencyMs: 0,
  }

  let overallDegraded = false
  let overallUnhealthy = false

  // 1. Check Database with detailed metrics
  const dbStart = Date.now()
  try {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
    const orgCount = await db.organization.count()
    results.services.database.status = 'healthy'
    results.services.database.latency = Date.now() - dbStart
    
    // Get pool connection info if available
    try {
      const poolStats = await db.$queryRaw`SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active'`
      results.services.database.poolSize = Array.isArray(poolStats) && poolStats[0] ? Number(poolStats[0].active_connections) : undefined
    } catch {
      // Pool stats not available, ignore
    }
  } catch (error) {
    results.services.database.status = 'unhealthy'
    results.services.database.latency = Date.now() - dbStart
    overallUnhealthy = true
  }

  // 2. Check Storage with disk usage
  const storageStart = Date.now()
  try {
    const storageDir = storageRoot()
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true })
    
    const testFile = path.join(storageDir, `.health_check_${Date.now()}.tmp`)
    fs.writeFileSync(testFile, 'health', 'utf-8')
    fs.unlinkSync(testFile)
    
    results.services.storage.status = 'healthy'
    results.services.storage.latency = Date.now() - storageStart
    
    // Calculate disk usage
    try {
      const stats = fs.statSync(storageDir)
      results.services.storage.diskUsage = `${Math.round(stats.size / 1024 / 1024)}MB`
    } catch {
      // Disk usage not available
    }
  } catch (error) {
    results.services.storage.status = 'unhealthy'
    results.services.storage.latency = Date.now() - storageStart
    overallUnhealthy = true
  }

  // 3. Check Kernel with latency tracking
  const kernelStart = Date.now()
  const kernelUrl = process.env.FASTAPI_URL || process.env.BROWSER_SIDECAR_URL || 'http://localhost:8000'
  try {
    const res = await fetch(`${kernelUrl}/`, { signal: AbortSignal.timeout(5000) })
    results.services.kernel.latency = Date.now() - kernelStart
    
    if (res.ok) {
      results.services.kernel.status = 'healthy'
    } else {
      results.services.kernel.status = 'degraded'
      overallDegraded = true
    }
  } catch (error) {
    results.services.kernel.status = 'unreachable'
    results.services.kernel.latency = Date.now() - kernelStart
    overallDegraded = true
  }

  // 4. Check Redis if configured
  if (process.env.REDIS_URL) {
    const redisStart = Date.now()
    try {
      // Simple Redis health check using ioredis
      const Redis = require('ioredis')
      const redis = new Redis(process.env.REDIS_URL, { lazyConnect: true })
      await redis.ping()
      await redis.quit()
      
      results.services.redis = { status: 'healthy', latency: Date.now() - redisStart }
    } catch (error) {
      results.services.redis = { status: 'unhealthy', latency: Date.now() - redisStart }
      overallDegraded = true
    }
  }

  // Determine overall status
  if (overallUnhealthy) {
    results.status = 'unhealthy'
  } else if (overallDegraded) {
    results.status = 'degraded'
  }

  results.latencyMs = Date.now() - start
  const statusCode = results.status === 'healthy' ? 200 : results.status === 'degraded' ? 200 : 503

  return NextResponse.json(results, { status: statusCode })
}
