import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const events = await db.event.findMany({
    where: { organizationId: auth.user.id },
    include: { actor: { select: { id: true, name: true, code: true, avatarColor: true } } },
    orderBy: { timestamp: 'desc' },
    take: 100,
  })
  return NextResponse.json(events)
}
