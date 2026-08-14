import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { getN8nStatus, triggerEkvaarMarketing } from '@/lib/n8n'
import { sanitizeInput } from '@/lib/security'
import { createMarketingFounderApproval } from '@/lib/marketing-approval'

function parsePayload(payload: string) {
  try { return JSON.parse(payload) } catch { return { raw: payload } }
}

async function marketingAgent(organizationId: string, id: string) {
  return db.agent.findFirst({ where: { id, organizationId, department: 'MARKETING', isHuman: false } })
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const { id } = await params
  if (!await marketingAgent(auth.organizationId, id)) return NextResponse.json({ error: 'Marketing automation is restricted to marketing agents' }, { status: 403 })
  const events = await db.event.findMany({ where: { organizationId: auth.organizationId, type: 'N8N_MARKETING_OUTPUT' }, orderBy: { timestamp: 'desc' }, take: 10 })
  return NextResponse.json({ status: getN8nStatus(), runs: events.map((event) => ({ ...event, payload: parsePayload(event.payload) })) })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const { id } = await params
  const agent = await marketingAgent(auth.organizationId, id)
  if (!agent) return NextResponse.json({ error: 'Marketing automation is restricted to marketing agents' }, { status: 403 })
  try {
    const body = await req.json().catch(() => ({}))
    const instruction = sanitizeInput(typeof body.instruction === 'string' ? body.instruction : '', { maxLength: 1000 })
    const result = await triggerEkvaarMarketing({ organizationId: auth.organizationId, agentId: agent.id, agentCode: agent.code, instruction })
    const founderApproval = await createMarketingFounderApproval({ organizationId: auth.organizationId, requesterId: agent.id, workflowId: getN8nStatus().workflowId, instruction, result })
    const event = await db.event.create({ data: { organizationId: auth.organizationId, type: 'N8N_MARKETING_OUTPUT', actorId: agent.id, actorName: agent.name, summary: `${agent.name} generated an approval-gated marketing cycle`, payload: JSON.stringify({ workflowId: getN8nStatus().workflowId, instruction, result, founderApproval }), severity: 'INFO' } })
    return NextResponse.json({ ...result, eventId: event.id, founderApproval })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to execute marketing workflow' }, { status: 502 })
  }
}
