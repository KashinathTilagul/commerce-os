import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const issues = await db.issue.findMany({
    where: { userId: auth.user.id },
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
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const { title, description, priority, type, department } = body

    const code = `PAP-${Math.floor(Math.random() * 900) + 100}`

    const issue = await db.issue.create({
      data: {
        userId: auth.user.id,
        code,
        title,
        description,
        priority: priority || 'MEDIUM',
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
        userId: auth.user.id,
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
