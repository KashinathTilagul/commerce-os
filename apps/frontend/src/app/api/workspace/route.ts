import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const workspaces = await db.workspace.findMany({
    where: { organizationId: auth.organizationId },
    include: {
      connections: { select: { provider: true } },
      artifacts: { select: { id: true, title: true, type: true, mimeType: true, status: true, createdAt: true } },
      _count: { select: { artifacts: true, revisions: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ workspaces })
}
