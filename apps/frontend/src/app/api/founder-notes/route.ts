import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const notes = await db.founderNote.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const { title, body: content } = body

    const note = await db.founderNote.create({
      data: {
        userId: auth.user.id,
        title: title || 'New Note',
        excerpt: content ? content.slice(0, 100) : '',
        body: content || '',
        status: 'DRAFT',
      },
    })

    return NextResponse.json(note)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
