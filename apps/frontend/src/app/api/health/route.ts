export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const start = Date.now()
  const releaseVersion = process.env.RELEASE_VERSION || 'v3.3.1-release-stability'

  let dbStatus = 'healthy'
  let kernelStatus = 'healthy'
  let storageStatus = 'healthy'
  let isHealthy = true

  // 1. Check DB
  try {
    await db.organization.count()
  } catch {
    dbStatus = 'unhealthy'
    isHealthy = false
  }

  // 2. Check Storage
  try {
    const storageDir = path.join(process.cwd(), 'storage')
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true })
    const testFile = path.join(storageDir, `.health_check_${Date.now()}.tmp`)
    fs.writeFileSync(testFile, 'health', 'utf-8')
    fs.unlinkSync(testFile)
  } catch {
    storageStatus = 'unhealthy'
    isHealthy = false
  }

  // 3. Check Kernel (Optional soft warning)
  const kernelUrl = process.env.FASTAPI_URL || process.env.BROWSER_SIDECAR_URL || 'http://localhost:8000'
  try {
    const res = await fetch(`${kernelUrl}/`, { signal: AbortSignal.timeout(2000) })
    if (!res.ok) kernelStatus = 'degraded'
  } catch {
    kernelStatus = 'unreachable'
  }

  const latencyMs = Date.now() - start
  const status = isHealthy ? 'healthy' : 'unhealthy'
  const statusCode = isHealthy ? 200 : 503

  return NextResponse.json(
    {
      status,
      version: releaseVersion,
      services: {
        database: dbStatus,
        storage: storageStatus,
        kernel: kernelStatus,
      },
      latencyMs,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  )
}
