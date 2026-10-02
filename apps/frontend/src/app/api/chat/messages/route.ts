export const dynamic = 'force-dynamic'

import { after, NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { sanitizeInput, checkRateLimit, getClientIP } from '@/lib/security'
import { getOrCreateChannel } from '@/lib/chat'
import { routeObject } from '@/lib/ai-router'
import { getLiveBusinessSnapshot } from '@/lib/business-snapshot'
import { z } from 'zod'

const PostMessageSchema = z.object({
  channelId: z.string().min(1).max(100),
  content: z.string().min(1).max(4000),
  parentMessageId: z.string().max(100).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

const AgentReplySchema = z.object({
  reply: z.string().describe('In-character response in under 4 sentences, no markdown.'),
})

const BOT_CODES = ['CEO', 'CFO', 'CMO', 'COO', 'CTO', 'CCO']

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  const rateLimit = checkRateLimit(ip, req.nextUrl.pathname)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many messages sent. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    )
  }

  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const parsed = PostMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid message payload', details: parsed.error.issues }, { status: 400 })
    }

    const { channelId, content, parentMessageId, metadata } = parsed.data
    const cleanContent = sanitizeInput(content, { maxLength: 4000 }).trim()
    if (!cleanContent) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 })
    }

    const channel = await getOrCreateChannel(auth.organizationId, channelId)
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    // Verify parent message belongs to this tenant and channel
    let parent: { id: string } | null = null
    if (parentMessageId) {
      parent = await db.message.findFirst({
        where: { id: parentMessageId, channelId: channel.id },
        select: { id: true },
      })
      if (!parent) {
        return NextResponse.json({ error: 'Parent message not found in this channel' }, { status: 400 })
      }
    }

    const threadTitle = typeof metadata?.threadTitle === 'string'
      ? sanitizeInput(metadata.threadTitle, { maxLength: 100 })
      : null

    const message = await db.message.create({
      data: {
        channelId: channel.id,
        parentMessageId: parent ? parent.id : null,
        threadTitle,
        authorType: 'USER',
        authorId: auth.user?.id || 'FOUNDER',
        content: cleanContent,
        metadata: (metadata as any) || {},
      },
    })

    // If talking to an agent bot channel or tagged agent, generate an agent response
    const agentCode = BOT_CODES.find(code => channel.name.toUpperCase() === code || channel.name.toUpperCase().includes(code))
    if (agentCode) {
      // Respond after saving the user's message; model latency must not block sending.
      after(async () => {
      const agent = await db.agent.findFirst({
        where: { organizationId: auth.organizationId, code: agentCode },
      })

      if (agent && !agent.isHuman) {
        try {
          const liveContext = await getLiveBusinessSnapshot(auth.organizationId)
          const systemPrompt = `You are ${agent.name}, the ${agent.role} (${agent.department}) of this company.
Your Prime Directive: ${agent.primeDirective}
Your Skills: ${agent.skills}
Your current status: ${agent.status}.
${liveContext}
Instructions:
You are in the company chat channel #${channel.name}. Reply directly, in character, under 4 sentences, no markdown.`

          const { object } = await routeObject<z.infer<typeof AgentReplySchema>>('default', auth.organizationId, {
            schema: AgentReplySchema,
            system: systemPrompt,
            prompt: cleanContent,
            temperature: 0.7,
          })

          if (object?.reply) {
            await db.message.create({
              data: {
                channelId: channel.id,
                parentMessageId: parent ? parent.id : message.id,
                authorType: 'AGENT',
                authorId: agent.id,
                content: object.reply,
              },
            })
          }
        } catch (agentErr) {
          console.error('[Chat Agent Reply] Error generating bot reply:', agentErr)
          await db.message.create({ data: { channelId: channel.id, parentMessageId: parent ? parent.id : message.id, authorType: 'AGENT', authorId: agent.id, content: 'I could not generate a reply. Please check the connected AI provider and try again.' } })
        }
      }
      })
    }

    return NextResponse.json({ message })
  } catch (e: any) {
    console.error('[Chat Post Message] Error:', e)
    const detail = process.env.NODE_ENV === 'development' ? (e?.message || String(e)) : undefined
    return NextResponse.json({ error: 'Failed to send message', ...(detail ? { detail } : {}) }, { status: 500 })
  }
}
