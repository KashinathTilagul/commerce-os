import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const notes = await db.founderNote.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, body: content } = body

    const note = await db.founderNote.create({
      data: {
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
