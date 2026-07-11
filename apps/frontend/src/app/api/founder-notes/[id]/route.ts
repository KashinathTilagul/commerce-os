import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const existing = await db.founderNote.findUnique({ where: { id } })
    if (!existing || existing.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await req.json()
    const { title, body: content } = body

    const data: any = {}
    if (title !== undefined) data.title = title
    if (content !== undefined) {
      data.body = content
      data.excerpt = content.slice(0, 100)
    }

    const note = await db.founderNote.update({
      where: { id },
      data,
    })

    return NextResponse.json(note)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const existing = await db.founderNote.findUnique({ where: { id } })
    if (!existing || existing.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await db.founderNote.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
