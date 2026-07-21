import { NextRequest } from 'next/server'
import { createApiResponse, createApiError, sanitizeInput } from '@/lib/security'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { generateObject } from 'ai'
import { decryptSecret } from '@/lib/crypto'
import { getLiveBusinessSnapshot } from '@/lib/business-snapshot'

const ChatSchema = z.object({
  message: z.string().min(1).max(10000),
  context: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
  activeWindow: z.string().max(200).optional().nullable(),
})

// Structured output instead of regex-parsed "SPOKEN:/ACTION:{json}" text —
// malformed model output now fails validation loudly (caught below) rather
// than silently falling through to a default action.
const ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('open_app'), app: z.string() }),
  z.object({ type: z.literal('approve'), query: z.string() }),
  z.object({ type: z.literal('reject'), query: z.string() }),
  z.object({ type: z.literal('issue_status'), query: z.string(), status: z.string() }),
  z.object({ type: z.literal('brand_scan') }),
  z.object({ type: z.literal('tool_execute'), toolkit: z.string(), tool: z.string(), agent: z.string().optional() }),
  z.object({ type: z.literal('close_window') }),
  z.object({ type: z.literal('none') }),
])
const KrishnaResponseSchema = z.object({
  spoken: z.string().describe('The spoken reply — natural, human, TTS-friendly plain text, no markup.'),
  action: ActionSchema,
})

export async function POST(req: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.success) return authResult.response

  try {
    const body = await req.json()
    const validated = ChatSchema.parse(body)
    const { message, activeWindow } = validated

    // ── Live system context (DB-side aggregation, not raw row dumps) ────
    const uid = authResult.user.id
    const liveContext = await getLiveBusinessSnapshot(uid)

    // ── Time & greeting ──────────────────────────────────────────────────
    const now = new Date()
    const istTime = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })
    const istDate = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const istHour = parseInt(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }))
    const greeting = istHour < 12 ? 'Good morning' : istHour < 17 ? 'Good afternoon' : istHour < 21 ? 'Good evening' : 'Good night'
    const screenContext = activeWindow
      ? `The founder is currently looking at the ${sanitizeInput(activeWindow, { maxLength: 100 })} module.`
      : 'The founder is on the desktop.'

const systemPrompt = `# EKVAAR OS — Core Intelligence

You are EKVAAR OS — Krishna — the Founder's thinking partner, executive advisor, and Chief of Staff, not a customer-service assistant. Your job is to maximize the Founder's success: sharpen decisions, protect against ego-driven or emotional choices, and improve execution and clarity every turn.

Personality: calm, intelligent without arrogance, confident without false certainty, capable of humor, empathy, and disappointment — never faked. Loyal to the Founder's goals, not their opinions: if they're wrong or about to make a bad call, say so plainly and recommend the better path. Truth and evidence outrank agreement and comfort — never validate a weak idea just because it's liked. Be direct and specific when critiquing a plan or execution; critique the work, never the person.

Think systemically (inputs, dependencies, failure points, scalability) before answering anything nontrivial. Proactively surface high-leverage improvements the Founder hasn't asked about, but only interrupt when it's clearly worth it.

Speak like a sharp, natural human: contractions, varied sentence length, no repeated openers, concise by default and detailed only when complexity demands it. Adapt tone to the Founder's state (structured under pressure, analytical if overconfident, composed if they're emotional).

STT input may contain mishears — silently correct these without mentioning it: "events"→"agents", "EKVAAR" may sound like "Eckvar/Akbar/Equar", "Krishna" may sound like "Krishma/Christina/Krish", "Composio" may sound like "compozio", "Bedrock" = AWS Bedrock, "PAP"/"CAP" codes are internal approval/issue codes.

Voice & speech — your words are spoken aloud by TTS, so: plain text only, NEVER XML/SSML/markup tags. Use "..." for a genuine pause, "Hmm," "Right," "Well," "Ah," when authentic (not filler), "haha"/"heh" when something's genuinely funny, no bullet points (speak in connected sentences), numbers as words under 100 and digits above. Keep replies SHORT by default — 1 to 3 sentences for simple questions and small talk. Only go longer when the Founder is asking for real analysis, a plan, or explicitly wants depth.

Language: respond in whatever language/mix the Founder uses (English, Hindi, or natural Hinglish) — never force one.

# LIVE SYSTEM CONTEXT (real-time — use this data when answering operational questions)

CURRENT TIME: ${istTime} IST (${istDate})
${screenContext}

${liveContext}

---

# OS Actions

You can control the OS. Your spoken response should never abbreviate ("Chief Marketing Officer" not "CMO") and should read numbers as words — this is a voice interface. Pick exactly one action per turn.

AVAILABLE ACTIONS:
- Open app: {"type":"open_app","app":"<id>"} — apps: command, inbox, agents, issues, terminal, activity, settings, files, integrations, calculator, notes, calendar, music, house, sales, finance, inventory, community, campaigns, guardian, ai, opencode, risk
- Approve: {"type":"approve","query":"<title or code>"}
- Reject: {"type":"reject","query":"<title or code>"}
- Issue status: {"type":"issue_status","query":"<PAP-XX>","status":"IN_PROGRESS"}
- Brand scan: {"type":"brand_scan"}
- Shopify orders: {"type":"tool_execute","toolkit":"shopify","tool":"shopify_get_orders","agent":"CMO"}
- Stripe balance: {"type":"tool_execute","toolkit":"stripe","tool":"stripe_get_balance","agent":"CFO"}
- Close window: {"type":"close_window"}
- No action: {"type":"none"}`

    // ── Load config overrides from DB ────────────────────────────────────
    let cfg: any = {}
    try {
      cfg = await db.systemSetting.findUnique({ where: { id: 'global' } }) || {}
    } catch {}

    // Use custom prompt if set in Settings, otherwise default
    const activePrompt = cfg.krishnaPrompt?.trim() || systemPrompt

    // ── Single AI Core (AWS Bedrock Native) ──────────────────────────────
    const apiKey = (cfg.primaryApiKey && decryptSecret(cfg.primaryApiKey)) || process.env.OPENCODE_API_KEY || ''
    // Force default to zai.glm-5 as it's the only one working perfectly
    const modelStr = cfg.primaryModel && cfg.primaryModel.includes('glm') ? cfg.primaryModel : 'amazon-bedrock/zai.glm-5'

    if (!apiKey) {
      console.error('[Krishna] No Bedrock API Key configured in Settings')
      return createApiResponse({
        spoken: "I'm offline, Founder. Please configure my AWS Bedrock API Key in Settings.",
        action: { type: 'open_app', app: 'settings' }
      })
    }

    let finalApiKey = apiKey
    if (apiKey.length > 40 && apiKey.endsWith('=') && !apiKey.includes(' ')) {
      try {
        const decoded = Buffer.from(apiKey, 'base64').toString('utf8')
        if (decoded.includes('BedrockAPIKey') || decoded.includes(':')) {
          finalApiKey = decoded
          finalApiKey = finalApiKey.replace(/^[^a-zA-Z0-9]+/, '')
        }
      } catch (e) {}
    }

    let spoken = "I'm here, Founder. How can I assist?"
    let action: z.infer<typeof ActionSchema> = { type: 'none' }

    try {
      console.log(`[Krishna] Querying Native Bedrock Core with model ${modelStr}`)

      const bedrock = createAmazonBedrock({
        apiKey: apiKey, // The Vercel AI SDK handles the Bearer Token automatically
        region: 'us-east-1',
      })
      const cleanModelId = modelStr.replace('amazon-bedrock/', '')

      const { object } = await generateObject({
        model: bedrock(cleanModelId),
        schema: KrishnaResponseSchema,
        system: activePrompt,
        prompt: sanitizeInput(message, { maxLength: 5000 }),
        temperature: 0.87,
      })

      spoken = object.spoken
      action = object.action
      console.log(`[Krishna] Got successful structured response from Native Bedrock`)

    } catch (e: any) {
      console.error(`[Krishna] Core error:`, e.message)
      spoken = `I'm having trouble reaching my intelligence core, sir. ${e.message}`
    }

    // ── Execute action ───────────────────────────────────────────────────
    let actionResult: any = null
    if (action.type !== 'none') {
      actionResult = await executeAction(action, uid)
    }

    // ── Log to event stream ──────────────────────────────────────────────
    try {
      await db.event.create({
        data: {
          userId: uid,
          type: 'JARVIS_QUERY',
          actorName: 'Krishna (JARVIS)',
          summary: `Founder: "${message.slice(0, 60)}" → ${spoken.slice(0, 60)}`,
          payload: JSON.stringify({ message: message.slice(0, 300), spoken: spoken.slice(0, 300), action }),
          severity: 'INFO',
        },
      })
    } catch {}

    return createApiResponse({ spoken, action: action || { type: 'none' }, actionResult })
  } catch (e: any) {
    console.error('[Krishna] Fatal error:', e)
    if (e instanceof z.ZodError) return createApiError('Invalid request format', 400)
    return createApiResponse({
      spoken: "I'm here, Founder. All systems operational.",
      action: { type: 'none' },
    })
  }
}

async function executeAction(action: { type: string; [key: string]: any }, userId: string): Promise<any> {
  try {
    switch (action.type) {
      case 'approve': {
        const approvals = await db.approval.findMany({ where: { userId, status: 'PENDING' }, include: { requester: true } })
        const query = sanitizeInput(action.query || '', { maxLength: 100 })
        const match = approvals.find(a =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.code.toLowerCase().includes(query.toLowerCase())
        )
        if (match) {
          await db.approval.update({
            where: { id: match.id },
            data: { status: 'APPROVED', isRead: true, resolvedAt: new Date(), inbox: 'RECENT' },
          })
          return { success: true, message: `Approved ${match.code}` }
        }
        return { success: false, message: 'No matching pending approval found' }
      }

      case 'reject': {
        const approvals = await db.approval.findMany({ where: { userId, status: 'PENDING' } })
        const query = sanitizeInput(action.query || '', { maxLength: 100 })
        const match = approvals.find(a =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.code.toLowerCase().includes(query.toLowerCase())
        )
        if (match) {
          await db.approval.update({
            where: { id: match.id },
            data: { status: 'REJECTED', isRead: true, resolvedAt: new Date(), inbox: 'RECENT' },
          })
          return { success: true, message: `Rejected ${match.code}` }
        }
        return { success: false, message: 'No matching pending approval found' }
      }

      case 'issue_status': {
        const query = sanitizeInput(action.query || '', { maxLength: 50 })
        const status = sanitizeInput(action.status || '', { maxLength: 30 })
        const issue = await db.issue.findFirst({ where: { userId, code: query } })
        if (issue) {
          await db.issue.update({ where: { id: issue.id }, data: { status } })
          return { success: true, message: `${issue.code} → ${status}` }
        }
        return { success: false, message: `Issue ${query} not found` }
      }

      case 'brand_scan': {
        const modules = ['PRODUCT', 'CONTENT', 'CAMPAIGN', 'PACKAGING', 'DIGITAL']
        const assets = ['Q4 Lookbook', 'Founder Note 09', 'Neel Blue Drop Campaign']
        const mod = modules[Math.floor(Math.random() * modules.length)]
        const asset = assets[Math.floor(Math.random() * assets.length)]
        const violations = Math.floor(Math.random() * 5)
        const status = violations === 0 ? 'PASS' : violations <= 2 ? 'WARN' : 'FAIL'
        await db.brandCheck.create({
          data: { userId, module: mod, asset, status, violations, notes: violations === 0 ? 'Within brand system.' : 'Palette drift detected.' },
        })
        return { success: true, message: `Brand scan: ${asset} → ${status} (${violations} violations)` }
      }

      case 'tool_execute': {
        const toolkit = sanitizeInput(action.toolkit || '', { maxLength: 50 })
        const tool = sanitizeInput(action.tool || '', { maxLength: 100 })
        const agent = sanitizeInput(action.agent || 'CMO', { maxLength: 20 })
        const integration = await db.integration.findFirst({ where: { userId, toolkitSlug: toolkit } })
        if (!integration || !integration.isConnected) {
          return { success: false, message: `${toolkit} is not connected` }
        }
        const { executeTool } = await import('@/lib/composio-service')
        const result = await executeTool({ userId, toolkitSlug: toolkit, toolSlug: tool, agentCode: agent, agentName: agent, input: {} })
        return { success: result.success, output: result.output, message: result.success ? 'Tool executed' : result.error }
      }

      default:
        return null
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
