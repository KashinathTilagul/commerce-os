export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { probeKernelHealth } from '@/lib/kernel-health'

export async function GET() {
  const result = await probeKernelHealth()
  const timestamp = new Date().toISOString()

  if (!result.configured) {
    return NextResponse.json({
      status: 'not_configured',
      kernel: 'not_configured',
      configured: false,
      optional: true,
      message: 'Optional Python kernel / browser sidecar is not configured for this serverless deployment.',
      latencyMs: result.latencyMs,
      timestamp,
    })
  }

  if (result.status === 'healthy') {
    return NextResponse.json({
      status: 'healthy',
      kernel: 'connected',
      configured: true,
      url: result.url,
      response: result.response ?? {},
      latencyMs: result.latencyMs,
      timestamp,
    })
  }

  if (result.status === 'degraded') {
    return NextResponse.json(
      {
        status: 'unhealthy',
        kernel: 'error',
        configured: true,
        url: result.url,
        statusCode: result.statusCode,
        latencyMs: result.latencyMs,
        timestamp,
      },
      { status: 503 }
    )
  }

  return NextResponse.json(
    {
      status: 'unhealthy',
      kernel: 'unreachable',
      configured: true,
      url: result.url,
      error: result.error || 'Kernel connection failed',
      latencyMs: result.latencyMs,
      timestamp,
    },
    { status: 503 }
  )
}
