import { NextResponse } from 'next/server'

export async function GET() {
  const start = Date.now()
  const kernelUrl = process.env.FASTAPI_URL || process.env.BROWSER_SIDECAR_URL || 'http://localhost:8000'

  try {
    const response = await fetch(`${kernelUrl}/`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(5000),
    })

    const latencyMs = Date.now() - start

    if (response.ok) {
      const data = await response.json().catch(() => ({}))
      return NextResponse.json({
        status: 'healthy',
        kernel: 'connected',
        url: kernelUrl,
        response: data,
        latencyMs,
        timestamp: new Date().toISOString(),
      })
    } else {
      return NextResponse.json(
        {
          status: 'unhealthy',
          kernel: 'error',
          url: kernelUrl,
          statusCode: response.status,
          latencyMs,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        kernel: 'unreachable',
        url: kernelUrl,
        error: error.message || 'Kernel connection failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
