export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { runEngineeredSecurityScan } from '@/lib/security-scanner'
import { processSecurityAlert } from '@/lib/security-escalator'
import { secretsMatch } from '@/lib/cron-auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  // Execute engineered non-AI security scan
  const scanResult = await runEngineeredSecurityScan(auth.organizationId)
  return NextResponse.json(scanResult)
}

export async function POST(req: NextRequest) {
  // Support both session auth OR dedicated webhook header token
  const token = req.headers.get('x-security-token')
  const secret = process.env.SECURITY_WEBHOOK_SECRET

  let organizationId: string | null = null

  if (token) {
    if (!secret) {
      return NextResponse.json({ error: 'Security webhook secret not configured on server' }, { status: 503 })
    }
    if (!secretsMatch(token, secret)) {
      return NextResponse.json({ error: 'Invalid security token' }, { status: 401 })
    }
    const founder = await db.user.findFirst({
      where: { organizationId: { not: null } },
      orderBy: { createdAt: 'asc' },
      select: { organizationId: true },
    })
    organizationId = founder?.organizationId || null
  } else {
    const auth = await requireOrganization()
    if (!auth.success) return auth.response
    organizationId = auth.organizationId
  }

  if (!organizationId) {
    return NextResponse.json({ error: 'User context missing' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { title, description, severity, affectedPath, poc, recommendedPatch, ruleId } = body

    if (!title || !description || !severity) {
      return NextResponse.json({ error: 'Missing required title, description, or severity' }, { status: 400 })
    }

    const result = await processSecurityAlert(organizationId, {
      title,
      description,
      severity: severity === 'CRITICAL' ? 'CRITICAL' : severity === 'WARNING' ? 'WARNING' : 'INFO',
      affectedPath,
      poc,
      recommendedPatch,
      ruleId,
    })

    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
