export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { resolveGovernanceApproval } from '@/lib/agents/governance/approval-service'

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

    const updated = await resolveGovernanceApproval(auth.organizationId, id, status)
    return NextResponse.json({ approval: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update approval' }, { status: 500 })
  }
}
