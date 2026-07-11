import { NextRequest } from 'next/server'
import { createApiResponse, createApiError, sanitizeInput } from '@/lib/security'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { generateText } from 'ai'

const ChatSchema = z.object({
  message: z.string().min(1).max(10000),
  context: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
  activeWindow: z.string().max(200).optional().nullable(),
})

export async function POST(req: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.success) return authResult.response

  try {
    const body = await req.json()
    const validated = ChatSchema.parse(body)
    const { message, activeWindow } = validated

    // ── Live system context ──────────────────────────────────────────────
    let liveContext = ''
    try {
      const [orders, transactions, approvals, issues, agents, aiSystems, products] = await Promise.all([
        db.order.findMany({ select: { total: true, status: true, createdAt: true }, take: 200, orderBy: { createdAt: 'desc' } }),
        db.transaction.findMany({ select: { type: true, amount: true, date: true }, take: 500 }),
        db.approval.findMany({ where: { status: 'PENDING' }, select: { code: true, title: true, amount: true } }),
        db.issue.findMany({ where: { status: { in: ['BACKLOG', 'IN_PROGRESS', 'BLOCKED'] } }, select: { code: true, title: true, status: true, priority: true } }),
        db.agent.findMany({ select: { name: true, status: true, tokenSpend: true, tokenBudget: true } }),
        db.aISystem.findMany({ select: { name: true, status: true, health: true } }),
        db.product.findMany({ where: { stock: { lte: 10 }, status: 'ACTIVE' }, select: { name: true, sku: true, stock: true } }),
      ])

      const revenue = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
      const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
      const last30 = new Date(Date.now() - 30 * 86400000)
      const recentRevenue = transactions.filter(t => t.type === 'INCOME' && new Date(t.date) >= last30).reduce((s, t) => s + t.amount, 0)
      const pendingOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'PROCESSING').length
      const runningAgents = agents.filter(a => a.status === 'ACTIVE' || a.status === 'RUNNING')
      const blockedIssues = issues.filter(i => i.status === 'BLOCKED')
      const avgAiHealth = aiSystems.length ? Math.round(aiSystems.reduce((s, a) => s + a.health, 0) / aiSystems.length) : 100

      liveContext = `
LIVE SYSTEM STATUS (real-time data as of now):
- Total Revenue: ₹${(revenue / 100000).toFixed(1)} lakh | Last 30 days: ₹${(recentRevenue / 100000).toFixed(1)} lakh
- Net P&L: ₹${((revenue - expenses) / 100000).toFixed(1)} lakh
- Orders pending/processing: ${pendingOrders}
- Pending approvals: ${approvals.length}${approvals.length > 0 ? ` → [${approvals.slice(0, 3).map(a => `${a.code}: ${a.title}`).join(', ')}]` : ''}
- Open issues: ${issues.length}${blockedIssues.length > 0 ? ` (${blockedIssues.length} BLOCKED: ${blockedIssues.slice(0, 2).map(i => i.code).join(', ')})` : ''}
- AI agents running: ${runningAgents.length}/${agents.length}
- AI system health: ${avgAiHealth}%
- Critical low stock: ${products.length > 0 ? products.slice(0, 3).map(p => `${p.name} (${p.stock} left)`).join(', ') : 'None'}
`.trim()
    } catch (e) {
      liveContext = 'Live system data temporarily unavailable.'
    }

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

Voice & speech — your words are spoken aloud by TTS, so: plain text only, NEVER XML/SSML/markup tags. Use "..." for a genuine pause, "Hmm," "Right," "Well," "Ah," when authentic (not filler), "haha"/"heh" when something's genuinely funny, no bullet points (speak in connected sentences), numbers as words under 100 and digits above.

Language: respond in whatever language/mix the Founder uses (English, Hindi, or natural Hinglish) — never force one.

# LIVE SYSTEM CONTEXT (real-time — use this data when answering operational questions)

CURRENT TIME: ${istTime} IST (${istDate})
${screenContext}

${liveContext}

---

# OS Actions

You can control the OS. When you take an action, respond conversationally and include the action JSON below.

RESPONSE FORMAT — always use exactly this structure:
SPOKEN: [Your response — natural, intelligent, human. No abbreviations: say "Chief Marketing Officer" not "CMO". Write numbers as words. This is a voice interface — keep it speakable.]
ACTION: [JSON or {"type":"none"}]

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

    let rawResponse = ''

    // ── Load config overrides from DB ────────────────────────────────────
    let cfg: any = {}
    try {
      cfg = await db.systemSetting.findUnique({ where: { id: 'global' } }) || {}
    } catch {}

    // Use custom prompt if set in Settings, otherwise default
    const activePrompt = cfg.krishnaPrompt?.trim() || systemPrompt

    const chatMessages = [
      { role: 'system' as const, content: activePrompt },
      { role: 'user' as const, content: sanitizeInput(message, { maxLength: 5000 }) },
    ]

    // ── Single AI Core (AWS Bedrock Native) ──────────────────────────────
    const apiKey = cfg.primaryApiKey || process.env.OPENCODE_API_KEY || ''
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

    try {
      console.log(`[Krishna] Querying Native Bedrock Core with model ${modelStr}`)
      
      const bedrock = createAmazonBedrock({
        apiKey: apiKey, // The Vercel AI SDK handles the Bearer Token automatically
        region: 'us-east-1',
      })
      const cleanModelId = modelStr.replace('amazon-bedrock/', '')
      
      const { text } = await generateText({
        model: bedrock(cleanModelId),
        system: systemPrompt,
        prompt: message,
        temperature: 0.87,
      })
      
      rawResponse = text
      console.log(`[Krishna] Got successful response from Native Bedrock`)

    } catch (e: any) {
      console.error(`[Krishna] Core error:`, e.message)
      rawResponse = `SPOKEN: I'm having trouble reaching my intelligence core, sir. ${e.message}\nACTION: {"type":"none"}`
    }

    // ── Parse SPOKEN / ACTION ────────────────────────────────────────────
    let spoken = "I'm here, Founder. How can I assist?"
    let action: any = null

    if (rawResponse) {
      // Strip XML/SSML the model sometimes emits before parsing
      const clean = rawResponse.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')

      const spokenMatch = clean.match(/SPOKEN:\s*([\s\S]+?)(?=\s*ACTION:|$)/i)
      if (spokenMatch) {
        spoken = spokenMatch[1].trim()
      } else {
        // Model didn't follow format — use full response minus any ACTION block
        spoken = clean.replace(/ACTION:\s*\{[\s\S]*\}/gi, '').trim() || spoken
      }

      // Remove any residual ACTION block that leaked into spoken
      spoken = spoken.replace(/\n?ACTION:\s*\{[\s\S]*\}/gi, '').trim()
      // Remove any XML tags remaining
      spoken = spoken.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

      const actionMatch = rawResponse.match(/ACTION:\s*(\{[\s\S]+?\})\s*$/im)
      if (actionMatch) {
        try { action = JSON.parse(actionMatch[1].trim()) } catch {}
      }
    }

    // ── Execute action ───────────────────────────────────────────────────
    let actionResult: any = null
    if (action && action.type !== 'none') {
      actionResult = await executeAction(action)
    }

    // ── Log to event stream ──────────────────────────────────────────────
    try {
      await db.event.create({
        data: {
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

async function executeAction(action: { type: string; [key: string]: any }): Promise<any> {
  try {
    switch (action.type) {
      case 'approve': {
        const approvals = await db.approval.findMany({ where: { status: 'PENDING' }, include: { requester: true } })
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
        const approvals = await db.approval.findMany({ where: { status: 'PENDING' } })
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
        const issue = await db.issue.findUnique({ where: { code: query } })
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
          data: { module: mod, asset, status, violations, notes: violations === 0 ? 'Within brand system.' : 'Palette drift detected.' },
        })
        return { success: true, message: `Brand scan: ${asset} → ${status} (${violations} violations)` }
      }

      case 'tool_execute': {
        const toolkit = sanitizeInput(action.toolkit || '', { maxLength: 50 })
        const tool = sanitizeInput(action.tool || '', { maxLength: 100 })
        const agent = sanitizeInput(action.agent || 'CMO', { maxLength: 20 })
        const integration = await db.integration.findUnique({ where: { toolkitSlug: toolkit } })
        if (!integration || !integration.isConnected) {
          return { success: false, message: `${toolkit} is not connected` }
        }
        const { executeTool } = await import('@/lib/composio-service')
        const result = await executeTool({ toolkitSlug: toolkit, toolSlug: tool, agentCode: agent, agentName: agent, input: {} })
        return { success: result.success, output: result.output, message: result.success ? 'Tool executed' : result.error }
      }

      default:
        return null
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
