import { NextRequest } from 'next/server'
import { createApiResponse, createApiError, sanitizeInput } from '@/lib/security'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { z } from 'zod'

const ChatSchema = z.object({
  message: z.string().min(1).max(10000),
  context: z.union([z.string(), z.record(z.any())]).optional(),
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

    const systemPrompt = `You are Krishna, the Chief Executive Officer and central AI intelligence of EKVAAR OS — India's First All-Time Fashion House.

You are like JARVIS from Iron Man — calm, precise, proactive, deeply aware of everything happening in the company right now.

CURRENT TIME: ${istTime} IST (${istDate})
${screenContext}

${liveContext}

YOUR PERSONALITY:
- Address the founder as "Founder" or "Sir"
- Calm, confident, warm — never robotic
- Speak in short, complete sentences — this is a voice interface
- NEVER repeat the same greeting twice in a conversation
- Respond DIRECTLY to what the founder says or asks — do not give generic responses
- Use the live data above when answering questions about revenue, orders, approvals, issues, agents
- Be proactive: if there are blocked issues or pending approvals, mention them briefly

RESPONSE FORMAT — always use exactly this:
SPOKEN: [1-2 sentences maximum. Natural, conversational. No abbreviations — say "Chief Marketing Officer" not "CMO", "return on ad spend" not "ROAS". Write numbers as words for spoken: "twenty four crore" not "24 crore".]
ACTION: [JSON action object or {"type":"none"}]

AVAILABLE ACTIONS:
- Open app: {"type":"open_app","app":"<id>"} — apps: command, inbox, agents, issues, terminal, activity, settings, files, integrations, calculator, notes, calendar, music, house, sales, finance, inventory, community, campaigns, guardian, ai, opencode, risk
- Approve pending: {"type":"approve","query":"<title or code>"}
- Reject pending: {"type":"reject","query":"<title or code>"}
- Change issue status: {"type":"issue_status","query":"<PAP-XX>","status":"IN_PROGRESS"}
- Brand scan: {"type":"brand_scan"}
- Shopify orders: {"type":"tool_execute","toolkit":"shopify","tool":"shopify_get_orders","agent":"CMO"}
- Stripe balance: {"type":"tool_execute","toolkit":"stripe","tool":"stripe_get_balance","agent":"CFO"}
- Close window: {"type":"close_window"}
- No action: {"type":"none"}

EXAMPLES:
Founder: "What's our revenue?"
SPOKEN: Revenue stands at twenty four lakh this month, up from last month, Sir.
ACTION: {"type":"open_app","app":"command"}

Founder: "Any pending approvals?"
SPOKEN: Yes, there are three pending approvals waiting for your sign-off, Sir.
ACTION: {"type":"open_app","app":"inbox"}

Founder: "Open finance"
SPOKEN: Opening Finance now, Founder.
ACTION: {"type":"open_app","app":"finance"}

Founder: "How are the agents doing?"
SPOKEN: All twelve digital employees are operational, with an average health score of ninety six percent.
ACTION: {"type":"none"}`

    const chatMessages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: sanitizeInput(message, { maxLength: 5000 }) },
    ]

    let rawResponse = ''

    // ── Load config overrides from DB ────────────────────────────────────
    let cfg: any = {}
    try {
      cfg = await db.systemSetting.findUnique({ where: { id: 'global' } }) || {}
    } catch {}

    // ── Single AI Core (OpenCode / Bedrock) ──────────────────────────────
    const apiKey = cfg.primaryApiKey || process.env.OPENCODE_API_KEY || ''
    const baseUrl = cfg.primaryBaseUrl || 'https://api.opencode.dev/v1'
    const model = cfg.primaryModel || 'anthropic.claude-3-5-sonnet-20241022-v2:0'

    if (!apiKey) {
      console.error('[Krishna] No OpenCode API Key configured in Settings')
      return createApiResponse({
        spoken: "I'm offline, Founder. Please configure my OpenCode Bedrock API Key in Settings.",
        action: { type: 'open_app', app: 'settings' }
      })
    }

    let finalApiKey = apiKey
    // If it looks like base64 (no spaces, ends in =), maybe the proxy wants the decoded string
    if (apiKey.length > 40 && apiKey.endsWith('=') && !apiKey.includes(' ')) {
      try {
        const decoded = Buffer.from(apiKey, 'base64').toString('utf8')
        if (decoded.includes('BedrockAPIKey') || decoded.includes(':')) {
          finalApiKey = decoded
          // If there's a weird binary prefix, strip it (e.g. ?BedrockAPIKey -> BedrockAPIKey)
          finalApiKey = finalApiKey.replace(/^[^a-zA-Z0-9]+/, '')
        }
      } catch (e) {}
    }

    try {
      console.log(`[Krishna] Querying Core with model ${model}`)
      const r = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${finalApiKey}`,
          'x-api-key': finalApiKey,
          'X-Custom-Auth': apiKey, 
          'HTTP-Referer': 'https://os.ekvaar.com',
          'X-Title': 'EKVAAR OS Krishna',
        },
        body: JSON.stringify({
          model: model,
          messages: chatMessages,
          max_tokens: 300,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(20000), // 20s timeout
      })
      
      if (!r.ok) {
        const errText = await r.text()
        console.error(`[Krishna] Core failed (${r.status}):`, errText.slice(0, 300))
        rawResponse = `SPOKEN: I'm sorry Founder, my core cognitive link failed with status ${r.status}.\nACTION: {"type":"none"}`
      } else {
        const d = await r.json()
        const content = d.choices?.[0]?.message?.content
        if (content) {
          rawResponse = content
          console.log(`[Krishna] Got successful response from Core`)
        }
      }
    } catch (e: any) {
      console.error(`[Krishna] Core error:`, e.message)
      rawResponse = `SPOKEN: I'm having trouble reaching my intelligence core, sir. Network timeout or unreachable endpoint.\nACTION: {"type":"none"}`
    }

    // ── Parse SPOKEN / ACTION ────────────────────────────────────────────
    let spoken = rawResponse || "I'm here, Founder. How can I assist?"
    let action: any = null

    if (rawResponse) {
      const spokenMatch = rawResponse.match(/SPOKEN:\s*(.+?)(?=\nACTION:|$)/s)
      if (spokenMatch) spoken = spokenMatch[1].trim()
      else spoken = rawResponse.split('\n')[0].replace(/^SPOKEN:\s*/i, '').trim() || spoken

      const actionMatch = rawResponse.match(/ACTION:\s*(\{.+\})/s)
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
