export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const notes = await db.founderNote.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const { title, body: content } = body

    const note = await db.founderNote.create({
      data: {
        organizationId: auth.organizationId,
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
