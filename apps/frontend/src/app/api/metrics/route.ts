export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { logger } from '@/lib/structured-logger'
import { applyRateLimit } from '@/lib/rate-limiter'

export async function GET(request: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  // Apply rate limiting (restrictive for metrics endpoint)
  const rateLimitResult = await applyRateLimit(
    `${auth.organizationId}:${auth.user.id}`,
    'API',
    request
  )
  
  if (!rateLimitResult.success && rateLimitResult.errorResponse) {
    const response = NextResponse.json(
      rateLimitResult.errorResponse.body,
      { status: rateLimitResult.errorResponse.status }
    )
    
    Object.entries(rateLimitResult.errorResponse.headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }

  try {
    const { searchParams } = new URL(request.url)
    const metricName = searchParams.get('name')
    const aggregate = searchParams.get('aggregate') === 'true'

    if (metricName) {
      // Get specific metric
      if (aggregate) {
        const aggregated = logger.getAggregatedMetrics(metricName)
        return NextResponse.json({
          name: metricName,
          aggregated,
        })
      } else {
        const metrics = logger.getMetrics(metricName)
        return NextResponse.json({
          name: metricName,
          count: metrics.length,
          metrics: metrics.slice(-100), // Return last 100 entries
        })
      }
    } else {
      // Get all metrics (summary)
      const allMetrics = logger.getAllMetrics()
      const summary = Object.entries(allMetrics).map(([name, data]) => ({
        name,
        count: data.length,
        latest: data[data.length - 1],
        aggregated: logger.getAggregatedMetrics(name),
      }))

      return NextResponse.json({
        totalMetricNames: summary.length,
        summary,
      })
    }

  } catch (error: any) {
    logger.error('Failed to fetch metrics', error, {
      userId: auth.user.id,
      organizationId: auth.organizationId,
    })
    return NextResponse.json({ error: error.message || 'Failed to fetch metrics' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(
    `${auth.organizationId}:${auth.user.id}`,
    'API',
    request
  )
  
  if (!rateLimitResult.success && rateLimitResult.errorResponse) {
    const response = NextResponse.json(
      rateLimitResult.errorResponse.body,
      { status: rateLimitResult.errorResponse.status }
    )
    
    Object.entries(rateLimitResult.errorResponse.headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }

  try {
    const { searchParams } = new URL(request.url)
    const metricName = searchParams.get('name')

    if (metricName) {
      logger.clearMetrics(metricName)
      logger.info(`Cleared metrics for ${metricName}`, {
        userId: auth.user.id,
        organizationId: auth.organizationId,
      })
      return NextResponse.json({ success: true, message: `Cleared metrics for ${metricName}` })
    } else {
      logger.clearAllMetrics()
      logger.info('Cleared all metrics', {
        userId: auth.user.id,
        organizationId: auth.organizationId,
      })
      return NextResponse.json({ success: true, message: 'Cleared all metrics' })
    }

  } catch (error: any) {
    logger.error('Failed to clear metrics', error, {
      userId: auth.user.id,
      organizationId: auth.organizationId,
    })
    return NextResponse.json({ error: error.message || 'Failed to clear metrics' }, { status: 500 })
  }
}