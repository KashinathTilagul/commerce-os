export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

// POST /api/issues/[id]/comments — add a comment to an issue
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { id } = await params
  const issue = await db.issue.findUnique({ where: { id } })
  if (!issue || issue.organizationId !== auth.organizationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

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
