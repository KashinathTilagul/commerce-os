export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const events = await db.event.findMany({
      where: { organizationId: auth.organizationId },
      orderBy: { timestamp: 'desc' },
      take: 50,
      include: {
        actor: { select: { id: true, name: true, code: true, avatarColor: true } },
      },
    })

    return NextResponse.json({ events })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch activity events' }, { status: 500 })
  }
}
