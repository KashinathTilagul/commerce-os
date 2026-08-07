import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

export const dynamic = 'force-dynamic'

// GET /api/agents/[id] — return agent details, manager, reports
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const agent = await db.agent.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: {
        manager: { select: { id: true, name: true, role: true, code: true } },
        reports: { select: { id: true, name: true, role: true, code: true, status: true } },
        _count: { select: { reports: true, issuesAssigned: true, runs: true } }
      }
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    return NextResponse.json(agent)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/agents/[id] — update agent soul, skills, description, primeDirective, status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const existing = await db.agent.findUnique({ where: { id } })
    if (!existing || existing.organizationId !== auth.organizationId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await req.json()
    const { name, role, primeDirective, description, skills, status, avatarColor } = body

    const data: any = {}
    if (name !== undefined) data.name = name
    if (role !== undefined) data.role = role
    if (primeDirective !== undefined) data.primeDirective = primeDirective
    if (description !== undefined) data.description = description
    if (skills !== undefined) data.skills = skills
    if (status !== undefined) data.status = status
    if (avatarColor !== undefined) data.avatarColor = avatarColor

    const updated = await db.agent.update({
      where: { id },
      data,
    })

    // Log the update
    await db.event.create({
      data: {
        organizationId: auth.organizationId,
        type: 'AGENT_UPDATED',
        actorName: 'Founder',
        summary: `Updated ${updated.name} (${updated.code}) — soul/skills/profile edited`,
        payload: JSON.stringify({ agentCode: updated.code, fields: Object.keys(data) }),
        severity: 'INFO',
      },
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
