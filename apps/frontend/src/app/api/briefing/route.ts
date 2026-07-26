import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { executeTool } from '@/lib/composio-service'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const uid = auth.organizationId

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 86400000)
  const fortyEightHrsAgo = new Date(now.getTime() - 48 * 3600 * 1000)

  // DB — always available
  const [blockedIssues, urgentIssues, pendingApprovals, stuckOrders] = await Promise.all([
    db.issue.findMany({
      where: { organizationId: uid, status: 'BLOCKED' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, code: true, title: true, priority: true, updatedAt: true },
    }),
    db.issue.findMany({
      where: { organizationId: uid, priority: 'P0', status: { not: 'DONE' } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, code: true, title: true, status: true },
    }),
    db.approval.findMany({
      where: { organizationId: uid, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, amount: true, type: true, createdAt: true },
    }),
    db.order.findMany({
      where: { organizationId: uid, status: 'PROCESSING', updatedAt: { lt: fortyEightHrsAgo } },
      orderBy: { updatedAt: 'asc' },
      take: 10,
      select: { id: true, orderNumber: true, customerName: true, total: true, updatedAt: true },
    }),
  ])

  // Composio — return data or the real error so the UI never lies about why
  async function tryTool(toolkitSlug: string, toolSlug: string, input: Record<string, any>) {
    try {
      const r = await executeTool({ organizationId: uid, toolkitSlug, toolSlug, agentCode: 'FOUNDER', agentName: 'Founder', input })
      return r.success ? { data: r.output, error: null } : { data: null, error: r.error || 'Tool failed' }
    } catch (e: any) { return { data: null, error: e.message || 'Tool failed' } }
  }

  const [gmail, calendar, discord] = await Promise.all([
    tryTool('gmail', 'gmail_get_emails', { query: 'is:unread is:important', max_results: 5 }),
    tryTool('google_calendar', 'google_calendar_list_events', {
      time_min: todayStart.toISOString(),
      time_max: todayEnd.toISOString(),
      max_results: 10,
    }),
    tryTool('discord', 'discord_get_messages', { limit: 10 }),
  ])

  return NextResponse.json({
    generatedAt: now.toISOString(),
    db: { blockedIssues, urgentIssues, pendingApprovals, stuckOrders },
    gmail: gmail.data,
    gmailError: gmail.error,
    calendar: calendar.data,
    calendarError: calendar.error,
    discord: discord.data,
    discordError: discord.error,
  })
}
