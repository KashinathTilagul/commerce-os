import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { runEngineeredSecurityScan } from '@/lib/security-scanner'
import { processSecurityAlert } from '@/lib/security-escalator'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  // Execute engineered non-AI security scan
  const scanResult = await runEngineeredSecurityScan(auth.user.id)
  return NextResponse.json(scanResult)
}

export async function POST(req: NextRequest) {
  // Support both session auth OR webhook header token
  const token = req.headers.get('x-security-token')
  const secret = process.env.SECURITY_WEBHOOK_SECRET || process.env.NEXTAUTH_SECRET || 'ekvaar-secret'

  let userId: string | null = null

  if (token && token === secret) {
    // Webhook caller — get founder user ID
    const founder = await db.user.findFirst({ orderBy: { createdAt: 'asc' } })
    userId = founder?.id || null
  } else {
    const auth = await requireAuth()
    if (!auth.success) return auth.response
    userId = auth.user.id
  }

  if (!userId) {
    return NextResponse.json({ error: 'User context missing' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { title, description, severity, affectedPath, poc, recommendedPatch, ruleId } = body

    if (!title || !description || !severity) {
      return NextResponse.json({ error: 'Missing required title, description, or severity' }, { status: 400 })
    }

    const result = await processSecurityAlert(userId, {
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
