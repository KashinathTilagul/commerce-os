import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const events = await db.calendarEvent.findMany({
    where: { userId: auth.user.id },
    orderBy: { start: 'asc' },
  })

  return NextResponse.json(events)
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const body = await req.json()
  const { title, description, start, end, color } = body

  if (!title || !start) {
    return NextResponse.json({ error: 'Title and start time required' }, { status: 400 })
  }

  const event = await db.calendarEvent.create({
    data: {
      userId: auth.user.id,
      title,
      description: description || '',
      start: new Date(start),
      end: end ? new Date(end) : new Date(start),
      color: color || '#1F3A5F',
      source: 'local',
    },
  })

  return NextResponse.json(event)
}
