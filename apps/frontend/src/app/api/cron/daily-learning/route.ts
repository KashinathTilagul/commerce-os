export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isCronAuthorized } from '@/lib/cron-auth'

function dateKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).replaceAll('-', '')
}

async function startLearning(organizationId: string, day: string) {
  const existing = await db.issue.findFirst({ where: { organizationId, code: `LRN-${day}` } })
  if (existing) return { created: false, parentId: existing.id }
  const agents = await db.agent.findMany({ where: { organizationId, isHuman: false }, orderBy: { code: 'asc' } })
  if (agents.length !== 65) throw new Error(`Expected the 65-agent roster, found ${agents.length}`)
  const hr = agents.find((agent) => agent.code === 'HR') || agents.find((agent) => agent.department === 'HR') || agents[0]

  return db.$transaction(async (tx) => {
    const parent = await tx.issue.create({ data: {
      organizationId, code: `LRN-${day}`, title: `Daily agent learning report · ${day}`,
      description: 'Compile today\'s 65 agent research notes, skill changes, sources, failed checks, and recommended updates. Submit the evidence-backed report for Founder review only after every child task has reported or blocked.',
      status: 'BACKLOG', priority: 'P3', type: 'RESEARCH', department: 'HR', assigneeId: hr.id, createdById: hr.id,
    } })
    await tx.issue.createMany({ data: agents.map((agent, index) => ({
      organizationId, code: `LRN-${day}-${String(index + 1).padStart(2, '0')}`,
      title: `${agent.name}: 30-minute daily expertise research`,
      description: `Research one current development directly relevant to your role as ${agent.role}. Use reputable sources, record URLs and retrieval times, spend no more than 30 minutes, identify what changed, test the lesson against your current work, and propose a skill update. Do not install or activate a generated skill without evaluation. Humanize the final report while preserving every fact.`,
      status: 'BACKLOG', priority: 'P2', type: 'RESEARCH', department: agent.department,
      assigneeId: agent.id, createdById: hr.id, parentIssueId: parent.id,
    })) })
    await tx.skill.upsert({ where: { organizationId_slug: { organizationId, slug: 'humanizer' } }, update: { isActive: true }, create: {
      organizationId, slug: 'humanizer', name: 'Humanizer', category: 'general', source: 'builtin', skillMdPath: 'agent-skills/humanizer/SKILL.md', riskLevel: 'low', version: '2.9.1',
    } })
    await tx.event.create({ data: { organizationId, type: 'DAILY_LEARNING_STARTED', actorId: hr.id, actorName: hr.name, summary: 'Opened a timeboxed research task for every one of the 65 agents', payload: JSON.stringify({ parentIssueId: parent.id, day, durationMinutes: 30, agents: 65 }), severity: 'INFO' } })
    return { created: true, parentId: parent.id, agents: agents.length }
  }, { timeout: 30_000 })
}

async function publishReport(organizationId: string, day: string) {
  const parent = await db.issue.findFirst({ where: { organizationId, code: `LRN-${day}` }, include: { subtasks: { include: { comments: { orderBy: { createdAt: 'desc' }, take: 1 } } } } })
  if (!parent) return { published: false, reason: 'No learning cycle exists' }
  const requester = await db.agent.findFirst({ where: { organizationId, OR: [{ code: 'HR' }, { department: 'HR' }] } })
  if (!requester) throw new Error('HR agent is unavailable')
  const completed = parent.subtasks.filter((issue) => ['DONE', 'IN_REVIEW', 'MILESTONE_REVIEW'].includes(issue.status))
  const blocked = parent.subtasks.filter((issue) => issue.status === 'BLOCKED')
  const pending = parent.subtasks.length - completed.length - blocked.length
  const existing = await db.approval.findUnique({ where: { organizationId_code: { organizationId, code: `APR-LRN-${day}` } } })
  if (existing) return { published: false, approvalId: existing.id, reason: 'Report already sent' }
  const highlights = completed.slice(0, 12).map((issue) => `${issue.code}: ${issue.comments[0]?.body.slice(0, 220) || issue.title}`).join('\n')
  const approval = await db.approval.create({ data: {
    organizationId, code: `APR-LRN-${day}`, type: 'STRATEGIC', title: `Daily learning report · ${day}`,
    description: `Completed: ${completed.length}/65. Blocked: ${blocked.length}. Pending: ${pending}.\n\n${highlights || 'No completed reports yet.'}`,
    requesterId: requester.id, issueCode: parent.code, inbox: pending ? 'BLOCKED' : 'UNREAD', policyDecision: { day, completed: completed.length, blocked: blocked.length, pending },
  } })
  return { published: true, approvalId: approval.id, completed: completed.length, blocked: blocked.length, pending }
}

export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  if (!isCronAuthorized(req.headers)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const phase = req.nextUrl.searchParams.get('phase') || 'start'
  const day = dateKey()
  const organizations = await db.organization.findMany({ select: { id: true } })
  const results: Array<Record<string, unknown>> = []
  for (const organization of organizations) {
    try {
      results.push({ organizationId: organization.id, ...(phase === 'report' ? await publishReport(organization.id, day) : await startLearning(organization.id, day)) })
    } catch (error: any) {
      results.push({ organizationId: organization.id, error: error.message })
    }
  }
  return NextResponse.json({ phase, day, results })
}
