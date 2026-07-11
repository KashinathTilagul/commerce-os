import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

// PATCH /api/agents/[id] — update agent soul, skills, description, primeDirective, status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const existing = await db.agent.findUnique({ where: { id } })
    if (!existing || existing.userId !== auth.user.id) {
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
        userId: auth.user.id,
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
