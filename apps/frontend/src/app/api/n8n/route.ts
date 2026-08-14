import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { getN8nStatus, triggerEkvaarMarketing } from '@/lib/n8n'
import { sanitizeInput } from '@/lib/security'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  return NextResponse.json(getN8nStatus())
}

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const body = await req.json().catch(() => ({}))
    const result = await triggerEkvaarMarketing({
      organizationId: auth.organizationId,
      instruction: sanitizeInput(typeof body.instruction === 'string' ? body.instruction : '', { maxLength: 1000 }),
    })
    await db.event.create({
      data: {
        organizationId: auth.organizationId,
        type: 'N8N_WORKFLOW_TRIGGERED',
        actorName: auth.user.name || 'Founder',
        summary: 'Triggered Ekvaar marketing automation',
        payload: JSON.stringify({ workflowId: getN8nStatus().workflowId }),
        severity: 'INFO',
      },
    })
    return NextResponse.json(result, { status: 202 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to trigger n8n' }, { status: 502 })
  }
}
