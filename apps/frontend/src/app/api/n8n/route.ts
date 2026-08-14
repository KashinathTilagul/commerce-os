import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { getN8nStatus, triggerEkvaarMarketing } from '@/lib/n8n'
import { sanitizeInput } from '@/lib/security'

function parsePayload(payload: string) {
  try { return JSON.parse(payload) } catch { return { raw: payload } }
}

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const runs = await db.event.findMany({
    where: { organizationId: auth.organizationId, type: 'N8N_MARKETING_OUTPUT' },
    orderBy: { timestamp: 'desc' },
    take: 10,
  })
  return NextResponse.json({ ...getN8nStatus(), runs: runs.map((run) => ({ ...run, payload: parsePayload(run.payload) })) })
}

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const body = await req.json().catch(() => ({}))
    const instruction = sanitizeInput(typeof body.instruction === 'string' ? body.instruction : '', { maxLength: 1000 })
    const result = await triggerEkvaarMarketing({
      organizationId: auth.organizationId,
      instruction,
    })
    const event = await db.event.create({
      data: {
        organizationId: auth.organizationId,
        type: 'N8N_MARKETING_OUTPUT',
        actorName: auth.user.name || 'Founder',
        summary: 'Generated an approval-gated Ekvaar marketing content cycle',
        payload: JSON.stringify({ workflowId: getN8nStatus().workflowId, instruction, result }),
        severity: 'INFO',
      },
    })
    return NextResponse.json({ ...result, eventId: event.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to trigger n8n' }, { status: 502 })
  }
}
