import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const start = Date.now()
  try {
    const orgCount = await db.organization.count()
    const latencyMs = Date.now() - start
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      organizations: orgCount,
      latencyMs,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message || 'Database query failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
