import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const agents = await db.agent.findMany({
    where: { organizationId: auth.user.id },
    include: {
      issuesAssigned: { select: { code: true, title: true, status: true, priority: true } },
      approvals: { select: { code: true, title: true, status: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(agents)
}
