import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const issues = await db.issue.findMany({
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
  try {
    const body = await req.json()
    const { title, description, priority, type, department } = body

    const code = `PAP-${Math.floor(Math.random() * 900) + 100}`

    const issue = await db.issue.create({
      data: {
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
