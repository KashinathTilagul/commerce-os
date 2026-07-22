import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { executeTool } from '@/lib/composio-service'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const uid = auth.user.id

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 86400000)
  const fortyEightHrsAgo = new Date(now.getTime() - 48 * 3600 * 1000)

  // DB — always available
  const [blockedIssues, urgentIssues, pendingApprovals, stuckOrders] = await Promise.all([
    db.issue.findMany({
      where: { userId: uid, status: 'BLOCKED' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, code: true, title: true, priority: true, updatedAt: true },
    }),
    db.issue.findMany({
      where: { userId: uid, priority: 'P0', status: { not: 'DONE' } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, code: true, title: true, status: true },
    }),
    db.approval.findMany({
      where: { userId: uid, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, amount: true, type: true, createdAt: true },
    }),
    db.order.findMany({
      where: { userId: uid, status: 'PROCESSING', updatedAt: { lt: fortyEightHrsAgo } },
      orderBy: { updatedAt: 'asc' },
      take: 10,
      select: { id: true, orderNumber: true, customerName: true, total: true, updatedAt: true },
    }),
  ])

  // Composio — gracefully skip if not connected
  async function tryTool(toolkitSlug: string, toolSlug: string, input: Record<string, any>) {
    try {
      const r = await executeTool({ userId: uid, toolkitSlug, toolSlug, agentCode: 'FOUNDER', agentName: 'Founder', input })
      return r.success ? r.output : null
    } catch { return null }
  }

  const [gmailData, calendarData, discordData] = await Promise.all([
    tryTool('gmail', 'gmail_get_emails', { query: 'is:unread is:important', maxResults: 5 }),
    tryTool('google_calendar', 'google_calendar_list_events', {
      timeMin: todayStart.toISOString(),
      timeMax: todayEnd.toISOString(),
      maxResults: 10,
    }),
    tryTool('discord', 'discord_get_messages', { limit: 10, mentionsOnly: true }),
  ])

  return NextResponse.json({
    generatedAt: now.toISOString(),
    db: { blockedIssues, urgentIssues, pendingApprovals, stuckOrders },
    gmail: gmailData,
    calendar: calendarData,
    discord: discordData,
  })
}
