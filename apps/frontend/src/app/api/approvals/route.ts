import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(req.url)
  const inbox = searchParams.get('inbox')

  const approvals = await db.approval.findMany({
    where: {
      userId: auth.user.id,
      ...(inbox && inbox !== 'ALL' ? { inbox } : {}),
    },
    include: {
      requester: { select: { id: true, name: true, code: true, avatarColor: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(approvals)
}
