export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const issues = await db.issue.findMany({
    where: { organizationId: auth.organizationId },
    include: {
      assignee: { select: { id: true, name: true, code: true, avatarColor: true, role: true } },
      createdBy: { select: { id: true, name: true, code: true, avatarColor: true } },
      comments: {
        include: {
          author: { select: { id: true, name: true, code: true, avatarColor: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(issues)
}

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const { title, description, priority, type, department } = body

    const code = `PAP-${Date.now().toString().slice(-6)}`

    const issue = await db.issue.create({
      data: {
        organizationId: auth.organizationId,
        code,
        title,
        description,
        priority: priority || 'P2',
        type: type || 'TASK',
        department: department || 'EXECUTIVE',
        status: 'BACKLOG',
      },
      include: {
        assignee: true,
        createdBy: true,
        comments: { include: { author: true } }
      }
    })

    await db.event.create({
      data: {
        organizationId: auth.organizationId,
        type: 'ISSUE_CREATED',
        actorName: 'Founder',
        summary: `Created issue ${code}: ${title}`,
        payload: JSON.stringify({ issueId: issue.id }),
        severity: 'INFO',
      },
    })

    return NextResponse.json(issue)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
