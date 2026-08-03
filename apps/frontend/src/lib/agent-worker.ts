import { z } from 'zod'
import { db } from './db'
import { routeObject, routeText } from './ai-router'
import { getLiveBusinessSnapshot } from './business-snapshot'
import { prepareAgentWithLearning, storeAgentPattern } from './agent-learning'
import { decomposeTask } from './task-templates'

const StatusSchema = z.object({
  progressNote: z.string().describe('1-2 sentences, first person, summarising what you just produced.'),
  newStatus: z.enum(['IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED', 'MILESTONE_REVIEW']).describe('MILESTONE_REVIEW if at a milestone checkpoint. IN_REVIEW if it needs founder sign-off before any external action. DONE only if fully complete. IN_PROGRESS if more work remains. BLOCKED if you lack info/access.'),
  blockedReason: z.string().optional().describe('If BLOCKED, what you need from the founder.'),
})

export interface WorkResult {
  ok: boolean
  message: string
  issueCode?: string
  newStatus?: string
  milestone?: number
}

// MILESTONE CONFIGURATION
const MILESTONE_CHECKPOINTS = [40, 60, 80, 100]
const MAX_ITERATIONS = 3

export async function runAgentWork(organizationId: string, agentId: string, targetIssueId?: string): Promise<WorkResult> {
  const agent = await db.agent.findFirst({ where: { id: agentId, organizationId } })
  if (!agent) return { ok: false, message: 'Agent not found' }
  if (agent.isHuman) return { ok: false, message: 'Human team member — not an executable agent' }

  // Get candidates: open tickets
  const candidates = await db.issue.findMany({
    where: { 
      organizationId, 
      assigneeId: agentId, 
      status: { in: ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'MILESTONE_REVIEW'] } 
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    include: { 
      comments: { orderBy: { createdAt: 'asc' }, take: 20 },
      subtasks: true
    },
  })
  
  const needsFounderReply = (i: (typeof candidates)[number]) => {
    const last = i.comments[i.comments.length - 1]
    return i.status === 'IN_REVIEW' && last && last.authorId == null
  }
  
  const issue = targetIssueId
    ? candidates.find(i => i.id === targetIssueId)
    : candidates.find(i => i.status === 'BACKLOG' || i.status === 'IN_PROGRESS') || candidates.find(needsFounderReply)
  
  if (!issue) {
    await db.agent.update({ where: { id: agentId }, data: { status: 'IDLE', currentTask: null } })
    return { ok: true, message: `${agent.name} has no open tickets` }
  }

  // GET LEARNING (deterministic)
  const learning = await prepareAgentWithLearning(agent.code, organizationId, issue.type || 'TASK')
  
  const priorWork = issue.comments
    .filter(c => c.kind === 'HEARTBEAT' || c.kind === 'COMMENT')
    .map(c => `- ${c.authorName}: ${c.body.slice(0, 400)}`)
    .join('\n') || '(no prior work yet)'

  const liveContext = await getLiveBusinessSnapshot(organizationId)

  // INJECT CONSTRAINTS (learning from past failures)
  const constraintsSection = learning.constraints.length > 0
    ? `\n\nCONSTRAINTS (violation = rejection):\n${learning.constraints.map((c, i) => `${i+1}. ${c}`).join('\n')}`
    : ''

  // INJECT SUCCESS PATTERNS (learning from past successes)
  const patternsSection = learning.successfulApproaches.length > 0
    ? `\n\nSUCCESS PATTERNS (use these approaches):\n${learning.successfulApproaches.map((p, i) => `${i+1}. ${JSON.stringify(p)}`).join('\n')}`
    : ''

  // MILESTONE CONTEXT
  const currentMilestone = issue.milestone || 0
  const nextMilestone = MILESTONE_CHECKPOINTS.find(m => m > currentMilestone) || 100
  const milestoneContext = currentMilestone < 100 
    ? `\n\nMILESTONE: You are at ${currentMilestone}%. Submit work at ${nextMilestone}% checkpoint for manager review.`
    : '\n\nMILESTONE: You are at 100%. Submit for founder review.'

  const system = `You are ${agent.name}, the ${agent.role} (${agent.department}) for this organization.
Your prime directive: ${agent.primeDirective}
Your skills: ${agent.skills}

You are actively working a ticket right now — not chatting. Produce REAL output a colleague could use immediately: actual campaign copy, an actual plan with steps and dates, an actual analysis with numbers. Do not describe what you "would" do — do it.

Rules:
- Ground anything operational in the live system data below; never invent metrics.
- You may plan and draft freely, but you must NOT assume any external action (publishing, sending, paying, posting) has happened. If the task needs that, finish your part and set status IN_REVIEW for the founder to approve.
- Set DONE only when the deliverable is complete and needs nothing external.
- Set BLOCKED only if you genuinely cannot proceed without founder input; say exactly what you need.
${constraintsSection}
${patternsSection}
${milestoneContext}

# LIVE SYSTEM CONTEXT
${liveContext}`

  const prompt = `TICKET ${issue.code} — ${issue.title}
Priority: ${issue.priority}
Description: ${issue.description}

Prior work and founder comments on this ticket (read these — address any founder request):
${priorWork}

Produce the COMPLETE deliverable for this ticket now. Write the actual work product in full, not a summary of it. For a plan: use clear sections with concrete steps, owners, dates, channels, budget split, and KPIs. For copy: write the actual copy. For analysis: give the actual numbers and the recommendation. Aim for something the founder could act on immediately. Markdown headings and bullets are fine.`

  // GENERATE DELIVERABLE
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

  // DECIDE STATUS
  let work: z.infer<typeof StatusSchema>
  try {
    const { object } = await routeObject<z.infer<typeof StatusSchema>>('fast', {
      schema: StatusSchema,
      system: `You are ${agent.name}. You just produced a deliverable for ticket ${issue.code}. Decide its status honestly.`,
      prompt: `Ticket: ${issue.title}\n\nDeliverable you produced:\n${deliverable.slice(0, 3000)}\n\nDecide the status based on milestones.`,
      temperature: 0,
    })
    work = object
  } catch {
    work = { progressNote: `Drafted the deliverable for ${issue.code}.`, newStatus: 'IN_REVIEW' }
  }

  // MILESTONE TRACKING
  let newMilestone = currentMilestone
  if (currentMilestone < 100 && work.newStatus === 'IN_PROGRESS') {
    // Advance milestone if work is substantial
    if (deliverable.length > 500) {
      newMilestone = nextMilestone
      if (newMilestone < 100) {
        work.newStatus = 'MILESTONE_REVIEW'
      }
    }
  }
  
  // Post the work as heartbeat
  const milestonePrefix = currentMilestone < 100 ? `[${currentMilestone}% → ${newMilestone}%] ` : ''
  const bodyText = work.newStatus === 'BLOCKED'
    ? `${milestonePrefix}${work.progressNote}\n\n⛔ BLOCKED — needs founder: ${work.blockedReason || 'input required'}`
    : `${milestonePrefix}${work.progressNote}\n\n— — —\n${deliverable}`
  await db.issueComment.create({
    data: { issueId: issue.id, authorId: agentId, authorName: agent.name, body: bodyText, kind: 'HEARTBEAT' },
  })

  // UPDATE ISSUE with milestone
  await db.issue.update({ 
    where: { id: issue.id }, 
    data: { 
      status: work.newStatus,
      milestone: newMilestone
    } 
  })

  // STORE LEARNING PATTERN
  const outcome = work.newStatus === 'DONE' ? 'SUCCESS' : work.newStatus === 'BLOCKED' ? 'REJECTED' : 'SUCCESS'
  await storeAgentPattern(
    organizationId,
    agent.code,
    issue.type || 'TASK',
    { title: issue.title, description: issue.description },
    { deliverable: deliverable.slice(0, 500), milestone: newMilestone },
    outcome,
    work.newStatus === 'BLOCKED' ? [work.blockedReason || 'Unknown'] : undefined,
    undefined,
    work.newStatus === 'DONE' ? 0.9 : work.newStatus === 'BLOCKED' ? 0.3 : 0.7
  )

  const remaining = await db.issue.count({
    where: { organizationId, assigneeId: agentId, status: { in: ['BACKLOG', 'IN_PROGRESS', 'MILESTONE_REVIEW'] } },
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
      tokenSpend: { increment: 120 },
    },
  })

  await db.event.create({
    data: {
      organizationId, type: 'AGENT_WORK', actorId: agentId, actorName: agent.name,
      summary: `${agent.name} worked ${issue.code} → ${work.newStatus} (${newMilestone}%)`,
      payload: JSON.stringify({ code: issue.code, status: work.newStatus, milestone: newMilestone }),
      severity: work.newStatus === 'BLOCKED' ? 'WARN' : 'INFO',
    },
  })

  return { 
    ok: true, 
    message: `${agent.name} worked ${issue.code} → ${work.newStatus}`, 
    issueCode: issue.code, 
    newStatus: work.newStatus,
    milestone: newMilestone
  }
}

// MANAGER DELEGATION: Chiefs decompose tasks into subtasks
export async function delegateToSpecialists(organizationId: string, managerCode: string, issueId: string): Promise<string[]> {
  const manager = await db.agent.findFirst({ 
    where: { code: managerCode, organizationId, managerId: null } 
  })
  if (!manager) return []
  
  const issue = await db.issue.findFirst({ 
    where: { id: issueId, organizationId } 
  })
  if (!issue) return []
  
  // Get decomposition template
  const subtasks = decomposeTask(issue.type || 'TASK', { title: issue.title })
  
  const createdSubtaskIds: string[] = []
  
  for (const subtaskDef of subtasks) {
    // Find appropriate specialist
    const specialist = await db.agent.findFirst({
      where: { 
        organizationId,
        department: subtaskDef.department,
        managerId: manager.id 
      }
    })
    
    if (!specialist) continue
    
    const count = await db.issue.count({ where: { organizationId } })
    const code = `PAP-${String(count + 1).padStart(2, '0')}`
    
    const subtaskIssue = await db.issue.create({
      data: {
        organizationId,
        code,
        title: subtaskDef.title,
        description: `Subtask of ${issue.code}: ${issue.title}`,
        status: 'BACKLOG',
        priority: issue.priority,
        type: 'TASK',
        assigneeId: specialist.id,
        department: subtaskDef.department,
        parentIssueId: issue.id
      }
    })
    
    createdSubtaskIds.push(subtaskIssue.id)
    
    // Update specialist
    await db.agent.update({
      where: { id: specialist.id },
      data: { currentTask: subtaskDef.title, status: 'ACTIVE' }
    })
  }
  
  return createdSubtaskIds
}

// ITERATION LOOP: Auto-respawn with constraints
export async function handleRejection(
  organizationId: string,
  issueId: string,
  rejectionReasons: string[],
  correction?: string
): Promise<boolean> {
  const issue = await db.issue.findFirst({ where: { id: issueId, organizationId } })
  if (!issue) return false
  
  // Check iteration count
  const iterations = issue.iterations || 0
  if (iterations >= MAX_ITERATIONS) {
    // Escalate to founder
    await db.issue.update({
      where: { id: issueId },
      data: { 
        status: 'IN_REVIEW',
        constraints: JSON.stringify([...(JSON.parse(issue.constraints || '[]') || []), ...rejectionReasons])
      }
    })
    
    await db.event.create({
      data: {
        organizationId,
        type: 'ISSUE_ESCALATED',
        actorName: 'System',
        summary: `Issue ${issue.code} exceeded max iterations, escalated to founder`,
        payload: JSON.stringify({ code: issue.code, iterations, reasons: rejectionReasons }),
        severity: 'WARN'
      }
    })
    
    return false
  }
  
  // Add constraints
  const existingConstraints = JSON.parse(issue.constraints || '[]') || []
  const newConstraints = [...existingConstraints, ...rejectionReasons]
  
  // Reset to last successful milestone
  const lastMilestone = Math.max(0, (issue.milestone || 0) - 20)
  
  // Store failure pattern
  if (issue.assigneeId) {
    const agent = await db.agent.findFirst({ where: { id: issue.assigneeId } })
    if (agent) {
      await storeAgentPattern(
        organizationId,
        agent.code,
        issue.type || 'TASK',
        { title: issue.title },
        { milestone: issue.milestone, approach: 'rejected' },
        'REJECTED',
        rejectionReasons,
        correction,
        0.2
      )
    }
  }
  
  // Respawn task
  await db.issue.update({
    where: { id: issueId },
    data: {
      status: 'BACKLOG',
      milestone: lastMilestone,
      iterations: iterations + 1,
      constraints: JSON.stringify(newConstraints)
    }
  })
  
  return true
}

export async function runAllBusyAgents(limit = 25): Promise<number> {
  const busy = await db.agent.findMany({
    where: { 
      isHuman: false, 
      issuesAssigned: { 
        some: { 
          status: { in: ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'MILESTONE_REVIEW'] } 
        } 
      } 
    },
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
