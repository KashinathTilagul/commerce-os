import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { id } = await params
  const body = await req.json()
  const { title, description, start, end, color } = body

  const existing = await db.calendarEvent.findFirst({
    where: { id, userId: auth.user.id },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const event = await db.calendarEvent.update({
    where: { id },
    data: {
      title: title ?? existing.title,
      description: description ?? existing.description,
      start: start ? new Date(start) : existing.start,
      end: end ? new Date(end) : existing.end,
      color: color ?? existing.color,
    },
  })

  return NextResponse.json(event)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { id } = await params
  const existing = await db.calendarEvent.findFirst({
    where: { id, userId: auth.user.id },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  await db.calendarEvent.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
