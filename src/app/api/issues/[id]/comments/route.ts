import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/issues/[id]/comments — add a comment to an issue
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { body: text, authorName } = body as { body: string; authorName: string }

  const comment = await db.issueComment.create({
    data: {
      issueId: id,
      authorName: authorName || 'Founder',
      body: text,
      kind: 'COMMENT',
    },
  })

  return NextResponse.json(comment)
}
