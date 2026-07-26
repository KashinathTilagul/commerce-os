import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization, requireAuth } from '@/lib/auth-guard'
import { z } from 'zod'
import { routeObject } from '@/lib/ai-router'
import { sanitizeInput } from '@/lib/security'
import { getLiveBusinessSnapshot } from '@/lib/business-snapshot'
import { runAgentWork } from '@/lib/agent-worker'

const ChatSchema = z.object({
  message: z.string().min(1).max(5000),
})

// The agent decides: is this a question to answer, or an instruction to act on?
const ChatDecision = z.object({
  reply: z.string().describe('Your spoken reply to the Founder, in character, under 4 sentences, no markdown.'),
  intent: z.enum(['answer', 'work']).describe("'work' if the Founder is instructing you to DO or produce something; 'answer' if it is a question or discussion."),
  task: z.string().optional().describe("If intent is 'work', the task phrased as a clear instruction to yourself."),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const agent = await db.agent.findUnique({ where: { id } })
    if (!agent || agent.organizationId !== auth.organizationId) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const body = await req.json()
    const { message } = ChatSchema.parse(body)

    const liveContext = await getLiveBusinessSnapshot(auth.organizationId)

    const systemPrompt = `You are ${agent.name}, the ${agent.role} of this company.
Your Prime Directive (Soul):
${agent.primeDirective}

Your Skills:
${agent.skills}

Your current status: ${agent.status}${agent.currentTask ? `, working on: ${agent.currentTask}` : ''}. Token spend: ₹${agent.tokenSpend.toFixed(0)}/${agent.tokenBudget.toFixed(0)}.

${liveContext}

Instructions:
You are chatting directly with the Founder, who can instruct you. If the Founder tells you to DO or produce something (write copy, make a plan, run an analysis, build something), set intent 'work' and put the task in 'task' — the system will open a ticket for you and you'll deliver the actual work on it. If it's a question or discussion, set intent 'answer' and just reply.
Never claim you have already finished work in your reply — when intent is 'work', say you're on it (the deliverable lands on the ticket). Use the live status above for operational facts; never invent numbers. Stay in character, concise, no markdown.`

    const { object } = await routeObject<z.infer<typeof ChatDecision>>('default', {
      schema: ChatDecision,
      system: systemPrompt,
      prompt: sanitizeInput(message, { maxLength: 5000 }),
      temperature: 0.7,
    })

    let reply = object.reply
    let issueCode: string | undefined

    // Direct instruction → work a ticket now. Reuse the agent's active ticket if
    // one is in flight (continuing a conversation must not spawn new tickets);
    // otherwise open a fresh one.
    if (object.intent === 'work' && object.task && !agent.isHuman) {
      const task = sanitizeInput(object.task, { maxLength: 300 })
      const active = await db.issue.findFirst({
        where: { organizationId: auth.organizationId, assigneeId: agent.id, status: { in: ['BACKLOG', 'IN_PROGRESS'] } },
        orderBy: { createdAt: 'desc' },
      })
      let target
      if (active) {
        // Continuation — append the new instruction, then rework the same ticket.
        await db.issueComment.create({ data: { issueId: active.id, authorName: 'Founder', body: task, kind: 'COMMENT' } })
        target = active
      } else {
        const count = await db.issue.count({ where: { organizationId: auth.organizationId } })
        target = await db.issue.create({
          data: {
            organizationId: auth.organizationId, code: `PAP-${String(count + 1).padStart(2, '0')}`, title: task,
            description: `Instructed directly by the Founder to ${agent.name} (${agent.role}).`,
            status: 'BACKLOG', priority: 'P2', type: 'TASK', assigneeId: agent.id, department: agent.department,
          },
        })
      }
      await db.agent.update({ where: { id: agent.id }, data: { currentTask: task, status: 'ACTIVE' } })
      const result = await runAgentWork(auth.organizationId, agent.id, target.id)
      issueCode = target.code
      reply = result.ok ? `On it — ${target.code}. ${reply}` : `I couldn't start that. ${result.message}`
    }

    await db.event.create({
      data: {
        organizationId: auth.organizationId, type: 'AGENT_CHAT', actorName: agent.name,
        summary: `Direct chat with ${agent.name}${issueCode ? ` → ${issueCode}` : ''}`,
        payload: JSON.stringify({ message: message.slice(0, 100), reply: reply.slice(0, 100), issueCode }),
        severity: 'INFO',
      },
    })

    return NextResponse.json({ reply, issueCode })
  } catch (e: any) {
    console.error('[Agent Chat] Error:', e)
    const detail = e?.message || String(e)
    return NextResponse.json({ error: 'Failed to process chat', detail }, { status: 500 })
  }
}
