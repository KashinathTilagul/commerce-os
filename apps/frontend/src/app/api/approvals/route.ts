import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(req.url)
  const inbox = searchParams.get('inbox')

  const approvals = await db.approval.findMany({
    where: {
      organizationId: auth.organizationId,
      ...(inbox && inbox !== 'ALL' ? { inbox } : {}),
    },
    include: {
      requester: { select: { id: true, name: true, code: true, avatarColor: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(approvals)
}
