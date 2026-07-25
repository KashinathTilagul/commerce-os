import { z } from 'zod'
import { db } from './db'
import { routeObject, routeText } from './ai-router'
import { getLiveBusinessSnapshot } from './business-snapshot'

// ── Agent execution loop ─────────────────────────────────────────────────────
// Makes a digital employee actually WORK its open assigned issues: the LLM,
// in the agent's persona, produces a real deliverable, posts it as a comment on
// the ticket, and advances the status. This is what was missing — assignment
// created a ticket but nothing ever acted on it.
//
// Safety: agents never take irreversible external actions (publish, send, spend)
// on their own. Anything needing that lands in IN_REVIEW for the founder.

const StatusSchema = z.object({
  progressNote: z.string().describe('1-2 sentences, first person, summarising what you just produced.'),
  newStatus: z.enum(['IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).describe('IN_REVIEW if it needs founder sign-off before any external action (publishing, spending, sending). DONE only if fully complete with nothing external left. IN_PROGRESS if more work remains. BLOCKED if you lack info/access.'),
  blockedReason: z.string().optional().describe('If BLOCKED, what you need from the founder.'),
})

export interface WorkResult {
  ok: boolean
  message: string
  issueCode?: string
  newStatus?: string
}

// Run one work cycle. Without targetIssueId: the agent's highest-priority open
// assigned issue. With targetIssueId (direct instruction): that specific ticket.
export async function runAgentWork(organizationId: string, agentId: string, targetIssueId?: string): Promise<WorkResult> {
  const agent = await db.agent.findFirst({ where: { id: agentId, organizationId } })
  if (!agent) return { ok: false, message: 'Agent not found' }
  if (agent.isHuman) return { ok: false, message: 'Human team member — not an executable agent' }

  // Candidates: open tickets, plus IN_REVIEW tickets the founder has commented
  // on since the agent last touched them (a push-back re-engages the agent).
  const candidates = await db.issue.findMany({
    where: { organizationId, assigneeId: agentId, status: { in: ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW'] } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    include: { comments: { orderBy: { createdAt: 'asc' }, take: 20 } },
  })
  const needsFounderReply = (i: (typeof candidates)[number]) => {
    const last = i.comments[i.comments.length - 1]
    return i.status === 'IN_REVIEW' && last && last.authorId == null // last comment is the founder's
  }
  const issue = targetIssueId
    ? candidates.find(i => i.id === targetIssueId)
    : candidates.find(i => i.status === 'BACKLOG' || i.status === 'IN_PROGRESS') || candidates.find(needsFounderReply)
  if (!issue) {
    // Nothing to act on — settle the agent to IDLE
    await db.agent.update({ where: { id: agentId }, data: { status: 'IDLE', currentTask: null } })
    return { ok: true, message: `${agent.name} has no open tickets` }
  }

  const priorWork = issue.comments
    .filter(c => c.kind === 'HEARTBEAT' || c.kind === 'COMMENT')
    .map(c => `- ${c.authorName}: ${c.body.slice(0, 400)}`)
    .join('\n') || '(no prior work yet)'

  const liveContext = await getLiveBusinessSnapshot(organizationId)

  const system = `You are ${agent.name}, the ${agent.role} (${agent.department}) at EKVAAR, an Indian fashion house.
Your prime directive: ${agent.primeDirective}
Your skills: ${agent.skills}

You are actively working a ticket right now — not chatting. Produce REAL output a colleague could use immediately: actual campaign copy, an actual plan with steps and dates, an actual analysis with numbers. Do not describe what you "would" do — do it.

Rules:
- Ground anything operational in the live system data below; never invent metrics.
- You may plan and draft freely, but you must NOT assume any external action (publishing, sending, paying, posting) has happened. If the task needs that, finish your part and set status IN_REVIEW for the founder to approve.
- Set DONE only when the deliverable is complete and needs nothing external.
- Set BLOCKED only if you genuinely cannot proceed without founder input; say exactly what you need.

# LIVE SYSTEM CONTEXT
${liveContext}`

  const prompt = `TICKET ${issue.code} — ${issue.title}
Priority: ${issue.priority}
Description: ${issue.description}

Prior work and founder comments on this ticket (read these — address any founder request):
${priorWork}

Produce the COMPLETE deliverable for this ticket now. Write the actual work product in full, not a summary of it. For a plan: use clear sections with concrete steps, owners, dates, channels, budget split, and KPIs. For copy: write the actual copy. For analysis: give the actual numbers and the recommendation. Aim for something the founder could act on immediately. Markdown headings and bullets are fine.`

  // Step 1 — the real, long-form deliverable (generateText doesn't compress like
  // a structured field does, which is why the first version produced only a title).
  let deliverable: string
  try {
    const r = await routeText('reasoning', { system, prompt, temperature: 0.6, maxOutputTokens: 2000 })
    deliverable = r.text.trim()
  } catch (e: any) {
    return { ok: false, message: `Agent core error: ${e?.message || e}` }
  }
  if (deliverable.length < 40) {
    return { ok: false, message: `${agent.name} returned an empty deliverable — try again` }
  }

  // Step 2 — decide the status given the deliverable (small, cheap call)
  let work: z.infer<typeof StatusSchema>
  try {
    const { object } = await routeObject<z.infer<typeof StatusSchema>>('fast', {
      schema: StatusSchema,
      system: `You are ${agent.name}. You just produced a deliverable for ticket ${issue.code}. Decide its status honestly.`,
      prompt: `Ticket: ${issue.title}\n\nDeliverable you produced:\n${deliverable.slice(0, 3000)}\n\nDecide the status.`,
      temperature: 0,
    })
    work = object
  } catch {
    work = { progressNote: `Drafted the deliverable for ${issue.code}.`, newStatus: 'IN_REVIEW' }
  }

  // Post the work as a heartbeat comment on the ticket
  const bodyText = work.newStatus === 'BLOCKED'
    ? `${work.progressNote}\n\n⛔ BLOCKED — needs founder: ${work.blockedReason || 'input required'}`
    : `${work.progressNote}\n\n— — —\n${deliverable}`
  await db.issueComment.create({
    data: { issueId: issue.id, authorId: agentId, authorName: agent.name, body: bodyText, kind: 'HEARTBEAT' },
  })

  await db.issue.update({ where: { id: issue.id }, data: { status: work.newStatus } })

  // Are there still open tickets for this agent?
  const remaining = await db.issue.count({
    where: { organizationId, assigneeId: agentId, status: { in: ['BACKLOG', 'IN_PROGRESS'] } },
  })
  const done = work.newStatus === 'DONE' || work.newStatus === 'IN_REVIEW'
  await db.agent.update({
    where: { id: agentId },
    data: {
      lastHeartbeat: new Date(),
      status: remaining > 0 ? 'ACTIVE' : 'IDLE',
      currentTask: remaining > 0 ? agent.currentTask : null,
      tasksToday: done ? { increment: 1 } : undefined,
      tasksTotal: done ? { increment: 1 } : undefined,
      tokenSpend: { increment: 120 }, // rough per-cycle estimate (₹)
    },
  })

  await db.event.create({
    data: {
      organizationId, type: 'AGENT_WORK', actorId: agentId, actorName: agent.name,
      summary: `${agent.name} worked ${issue.code} → ${work.newStatus}`,
      payload: JSON.stringify({ code: issue.code, status: work.newStatus }),
      severity: work.newStatus === 'BLOCKED' ? 'WARN' : 'INFO',
    },
  })

  return { ok: true, message: `${agent.name} worked ${issue.code} → ${work.newStatus}`, issueCode: issue.code, newStatus: work.newStatus }
}

// Advance one open ticket for every agent that has assigned work. Shared by the
// watchdog cron and the in-process auto-scheduler (instrumentation.ts).
export async function runAllBusyAgents(limit = 25): Promise<number> {
  const busy = await db.agent.findMany({
    where: { isHuman: false, issuesAssigned: { some: { status: { in: ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW'] } } } },
    select: { id: true, organizationId: true },
    take: limit,
  })
  let worked = 0
  for (const a of busy) {
    try {
      const r = await runAgentWork(a.organizationId, a.id)
      if (r.ok && r.issueCode) worked++
    } catch { /* keep going */ }
  }
  return worked
}
