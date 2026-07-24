import { z } from 'zod'
import { db } from './db'
import { routeObject } from './ai-router'
import { getLiveBusinessSnapshot } from './business-snapshot'

// ── Agent execution loop ─────────────────────────────────────────────────────
// Makes a digital employee actually WORK its open assigned issues: the LLM,
// in the agent's persona, produces a real deliverable, posts it as a comment on
// the ticket, and advances the status. This is what was missing — assignment
// created a ticket but nothing ever acted on it.
//
// Safety: agents never take irreversible external actions (publish, send, spend)
// on their own. Anything needing that lands in IN_REVIEW for the founder.

const WorkSchema = z.object({
  progressNote: z.string().describe('2-4 sentences: what you did this cycle, in first person, as the employee.'),
  deliverable: z.string().describe('The actual work product — the plan, copy, analysis, or decision. Concrete and usable, not a description of what you would do.'),
  newStatus: z.enum(['IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).describe('IN_REVIEW if it needs founder sign-off before any external action (publishing, spending, sending). DONE only if fully complete with nothing external left. BLOCKED if you lack info/access.'),
  blockedReason: z.string().optional().describe('If BLOCKED, what you need from the founder.'),
})

export interface WorkResult {
  ok: boolean
  message: string
  issueCode?: string
  newStatus?: string
}

// Run one work cycle for an agent's highest-priority open assigned issue.
export async function runAgentWork(userId: string, agentId: string): Promise<WorkResult> {
  const agent = await db.agent.findFirst({ where: { id: agentId, userId } })
  if (!agent) return { ok: false, message: 'Agent not found' }
  if (agent.isHuman) return { ok: false, message: 'Human team member — not an executable agent' }

  const issue = await db.issue.findFirst({
    where: { userId, assigneeId: agentId, status: { in: ['BACKLOG', 'IN_PROGRESS'] } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }], // P0 before P3, oldest first
    include: { comments: { orderBy: { createdAt: 'asc' }, take: 20 } },
  })
  if (!issue) {
    // Nothing open — settle the agent to IDLE
    await db.agent.update({ where: { id: agentId }, data: { status: 'IDLE', currentTask: null } })
    return { ok: true, message: `${agent.name} has no open tickets` }
  }

  const priorWork = issue.comments
    .filter(c => c.kind === 'HEARTBEAT' || c.kind === 'COMMENT')
    .map(c => `- ${c.authorName}: ${c.body.slice(0, 400)}`)
    .join('\n') || '(no prior work yet)'

  const liveContext = await getLiveBusinessSnapshot(userId)

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

Prior work on this ticket:
${priorWork}

Do the next real unit of work on this ticket now.`

  let work: z.infer<typeof WorkSchema>
  try {
    const { object } = await routeObject<z.infer<typeof WorkSchema>>('reasoning', {
      schema: WorkSchema, system, prompt, temperature: 0.6,
    })
    work = object
  } catch (e: any) {
    return { ok: false, message: `Agent core error: ${e?.message || e}` }
  }

  // Post the work as a heartbeat comment on the ticket
  const bodyText = work.newStatus === 'BLOCKED'
    ? `${work.progressNote}\n\n⛔ BLOCKED — needs founder: ${work.blockedReason || 'input required'}`
    : `${work.progressNote}\n\n— — —\n${work.deliverable}`
  await db.issueComment.create({
    data: { issueId: issue.id, authorId: agentId, authorName: agent.name, body: bodyText, kind: 'HEARTBEAT' },
  })

  await db.issue.update({ where: { id: issue.id }, data: { status: work.newStatus } })

  // Are there still open tickets for this agent?
  const remaining = await db.issue.count({
    where: { userId, assigneeId: agentId, status: { in: ['BACKLOG', 'IN_PROGRESS'] } },
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
      userId, type: 'AGENT_WORK', actorId: agentId, actorName: agent.name,
      summary: `${agent.name} worked ${issue.code} → ${work.newStatus}`,
      payload: JSON.stringify({ code: issue.code, status: work.newStatus }),
      severity: work.newStatus === 'BLOCKED' ? 'WARN' : 'INFO',
    },
  })

  return { ok: true, message: `${agent.name} worked ${issue.code} → ${work.newStatus}`, issueCode: issue.code, newStatus: work.newStatus }
}
