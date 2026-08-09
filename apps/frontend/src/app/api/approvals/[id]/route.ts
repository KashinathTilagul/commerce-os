export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { id } = await params

  try {
    const body = await req.json()
    const { status } = body

    if (!['APPROVED', 'REJECTED', 'REVISION_REQUESTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const approval = await db.approval.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: { requester: true },
    })

    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
    }

    const updated = await db.approval.update({
      where: { id },
      data: {
        status,
        resolvedAt: new Date(),
      },
    })

    await db.event.create({
      data: {
        organizationId: auth.organizationId,
        type: `APPROVAL_${status}`,
        actorName: 'Founder',
        summary: `Founder ${status.toLowerCase()} approval ${approval.code}: ${approval.title}`,
        payload: JSON.stringify({ approvalCode: approval.code, resolution: status }),
      },
    })

    return NextResponse.json({ approval: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update approval' }, { status: 500 })
  }
}
