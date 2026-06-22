import { NextResponse } from 'next/server'
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
