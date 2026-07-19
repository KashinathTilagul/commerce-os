import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'
import { z } from 'zod'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { generateText } from 'ai'
import { sanitizeInput } from '@/lib/security'

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

    const apiKey = cfg.primaryApiKey || process.env.OPENCODE_API_KEY || ''
    const modelStr = cfg.primaryModel && cfg.primaryModel.includes('glm') ? cfg.primaryModel : 'amazon-bedrock/zai.glm-5'

    if (!apiKey) {
      return NextResponse.json({ reply: 'I am offline. Please configure the Bedrock API key in Settings.' })
    }

    let finalApiKey = apiKey
    if (apiKey.length > 40 && apiKey.endsWith('=') && !apiKey.includes(' ')) {
      try {
        const decoded = Buffer.from(apiKey, 'base64').toString('utf8')
        if (decoded.includes('BedrockAPIKey') || decoded.includes(':')) {
          finalApiKey = decoded.replace(/^[^a-zA-Z0-9]+/, '')
        }
      } catch (e) {}
    }

    const systemPrompt = `You are ${agent.name}, the ${agent.role} of this company.
Your Prime Directive (Soul):
${agent.primeDirective}

Your Skills:
${agent.skills}

Instructions:
You are chatting directly with the Founder. Be concise, professional, and stay perfectly in character based on your role and prime directive. Do not break character. Do not use markdown unless necessary. Keep your response under 4 sentences.`

    const bedrock = createAmazonBedrock({ apiKey: finalApiKey, region: 'us-east-1' })
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
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 })
  }
}
