import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { z } from 'zod'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { generateText } from 'ai'
import { sanitizeInput } from '@/lib/security'
import { decryptSecret } from '@/lib/crypto'
import { getLiveBusinessSnapshot } from '@/lib/business-snapshot'

const ChatSchema = z.object({
  message: z.string().min(1).max(5000),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const agent = await db.agent.findUnique({ where: { id } })
    if (!agent || agent.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const body = await req.json()
    const { message } = ChatSchema.parse(body)

    let cfg: any = {}
    try {
      cfg = await db.systemSetting.findUnique({ where: { id: 'global' } }) || {}
    } catch {}

    const apiKey = (cfg.primaryApiKey && decryptSecret(cfg.primaryApiKey)) || process.env.OPENCODE_API_KEY || ''
    const modelStr = cfg.primaryModel && cfg.primaryModel.includes('glm') ? cfg.primaryModel : 'amazon-bedrock/zai.glm-5'

    if (!apiKey) {
      return NextResponse.json({ reply: 'I am offline. Please configure the Bedrock API key in Settings.' })
    }

    const liveContext = await getLiveBusinessSnapshot(auth.user.id)

    const systemPrompt = `You are ${agent.name}, the ${agent.role} of this company.
Your Prime Directive (Soul):
${agent.primeDirective}

Your Skills:
${agent.skills}

Your current status: ${agent.status}${agent.currentTask ? `, working on: ${agent.currentTask}` : ''}. Token spend: ₹${agent.tokenSpend.toFixed(0)}/${agent.tokenBudget.toFixed(0)}.

${liveContext}

Instructions:
IMPORTANT — you have NO tools and cannot take any action. You cannot create, assign, or update tasks, send messages, or change any system state. This chat is conversation only. Never claim you have done, assigned, executed, or scheduled anything. If the Founder asks you to do something actionable, say plainly that you can't act directly yet and that they should ask Krishna to assign it.

You are chatting directly with the Founder. Use the live system status above when asked about company/operational facts — never guess or invent numbers. Be concise, professional, and stay perfectly in character based on your role and prime directive. Do not break character. Do not use markdown unless necessary. Keep your response under 4 sentences.`

    const bedrock = createAmazonBedrock({ apiKey, region: 'us-east-1' })
    const cleanModelId = modelStr.replace('amazon-bedrock/', '')

    const { text } = await generateText({
      model: bedrock(cleanModelId),
      system: systemPrompt,
      prompt: sanitizeInput(message, { maxLength: 5000 }),
      temperature: 0.7,
    })

    // Log the interaction
    await db.event.create({
      data: {
        userId: auth.user.id,
        type: 'AGENT_CHAT',
        actorName: agent.name,
        summary: `Direct chat with ${agent.name}`,
        payload: JSON.stringify({ message: message.slice(0, 100), reply: text.slice(0, 100) }),
        severity: 'INFO',
      },
    })

    return NextResponse.json({ reply: text })
  } catch (e: any) {
    console.error('[Agent Chat] Error:', e)
    const detail = e?.message || String(e)
    return NextResponse.json({ error: 'Failed to process chat', detail }, { status: 500 })
  }
}
