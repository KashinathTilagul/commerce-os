import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const agents = await db.agent.findMany({
    include: {
      issuesAssigned: { select: { code: true, title: true, status: true, priority: true } },
      approvals: { select: { code: true, title: true, status: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(agents)
}
