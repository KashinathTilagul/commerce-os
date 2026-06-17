import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const events = await db.event.findMany({
    include: { actor: { select: { id: true, name: true, code: true, avatarColor: true } } },
    orderBy: { timestamp: 'desc' },
    take: 100,
  })
  return NextResponse.json(events)
}
