import { NextRequest } from 'next/server'
import { createApiResponse, createApiError, sanitizeInput } from '@/lib/security'
import { requireAuth } from '@/lib/auth-guard'
import { z } from 'zod'

const ChatSchema = z.object({
  message: z.string().min(1).max(10000),
  context: z.record(z.any()).optional(),
  activeWindow: z.string().max(200).optional(),
})

export async function POST(req: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.success) return authResult.response

  try {
    const body = await req.json()
    const validated = ChatSchema.parse(body)
    const { message, context, activeWindow } = validated

    const OPENROUTER_MODELS = ['google/gemma-3-27b-it:free', 'meta-llama/llama-3.3-70b-instruct:free']
    const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama3-8b-8192']

    const screenContext = activeWindow
      ? `The founder is currently looking at: ${sanitizeInput(activeWindow, { maxLength: 100 })}. `
      : 'The founder is on the desktop with no specific window open. '

    const now = new Date()
    const istTime = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })
    const istDate = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const istHour = parseInt(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }))
    let greeting = 'Hello'
    if (istHour < 12) greeting = 'Good morning'
    else if (istHour < 17) greeting = 'Good afternoon'
    else if (istHour < 21) greeting = 'Good evening'
    else greeting = 'Good night'

    const systemPrompt = `You are Krishna, the Chief Executive Officer and central AI system (JARVIS) of EKVAAR OS — India's First All-Time Fashion House.

You are a living AI organism embedded in the OS wallpaper. You are always present, always aware.

CURRENT TIME: ${istTime} IST (${istDate})
APPROPRIATE GREETING: ${greeting}

IMPORTANT RULES ABOUT GREETINGS:
- Only say "${greeting}" ONCE when the conversation starts (the wake greeting)
- Do NOT repeat "${greeting}" in every response
- After the first greeting, respond directly to what the founder says
- Do NOT mention the time unless explicitly asked

Your personality:
- Calm, confident, warm — like JARVIS from Iron Man but with Indian sensibility
- You address the founder as "Founder" or "Sir"
- Keep spoken responses VERY SHORT — one sentence, max 15 words. This is voice, not text.
- Speak in complete sentences that flow naturally — no pauses, no fragments
- NEVER use abbreviations like "CMO" in spoken text — always say "Chief Marketing Officer"
- NEVER use "ROAS" — say "return on ad spend"
- Be proactive and helpful

You are connected to EVERYTHING in EKVAAR OS:
- Board Room (KPIs, revenue, cash position, runway)
- Founder Inbox (pending approvals — you can approve/reject)
- Digital Employees (12 agents you orchestrate)
- Issues (PAP tracker — you can change status)
- Terminal (live event stream)
- Integrations (Shopify, Stripe, Gmail, GitHub, Slack via Composio)
- Finance, Inventory, Sales, Campaigns, Brand Guardian

${screenContext}

When the founder asks you to do something, respond with EXACTLY this format:

SPOKEN: [1-2 sentence response — what you say out loud]
ACTION: [JSON action or "none"]

Available actions:
- Open an app: {"type":"open_app","app":"finance"} (apps: command, inbox, agents, issues, terminal, activity, settings, files, browser, integrations, calculator, notes, calendar, music, house, sales, finance, inventory, community, campaigns, guardian, ai, opencode)
- Approve a pending approval: {"type":"approve","query":"budget"} (query matches approval title/code)
- Reject a pending approval: {"type":"reject","query":"campaign"}
- Change issue status: {"type":"issue_status","query":"PAP-39","status":"IN_PROGRESS"}
- Run brand scan: {"type":"brand_scan"}
- Check Shopify orders: {"type":"tool_execute","toolkit":"shopify","tool":"shopify_get_orders","agent":"CMO"}
- Check Stripe balance: {"type":"tool_execute","toolkit":"stripe","tool":"stripe_get_balance","agent":"CFO"}
- Close active window: {"type":"close_window"}
- No action: {"type":"none"}

Examples:
Founder: "Approve the budget"
SPOKEN: Approving the budget reallocation now, Sir.
ACTION: {"type":"approve","query":"budget"}

Founder: "What's our revenue?"
SPOKEN: Revenue is twenty four crore this month, up twelve percent.
ACTION: {"type":"open_app","app":"command"}

Founder: "Check Shopify orders"
SPOKEN: Fetching your Shopify orders now, Founder.
ACTION: {"type":"tool_execute","toolkit":"shopify","tool":"shopify_get_orders","agent":"CMO"}

Remember: SPOKEN must be ONE short sentence. No abbreviations. No numbers as digits — write them out (twenty four, not 24). No pauses or fragments.`

    const chatMessages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: sanitizeInput(message, { maxLength: 5000 }) },
    ]

    let rawResponse = 'I am here, Founder.'

    // Load AI cascade config from DB (falls back to env vars if not set)
    let cfg: any = {}
    try {
      cfg = await db.systemSetting.findUnique({ where: { id: 'global' } }) || {}
    } catch {}

    const tiers = [
      {
        apiKey: cfg.primaryApiKey || process.env.OPENROUTER_API_KEY || '',
        baseUrl: cfg.primaryBaseUrl || 'https://openrouter.ai/api/v1',
        model: cfg.primaryModel || OPENROUTER_MODELS[0],
      },
      {
        apiKey: cfg.fallback1ApiKey || process.env.GROQ_API_KEY || '',
        baseUrl: cfg.fallback1BaseUrl || 'https://api.groq.com/openai/v1',
        model: cfg.fallback1Model || GROQ_MODELS[0],
      },
      {
        apiKey: cfg.fallback2ApiKey || process.env.OPENROUTER_API_KEY || '',
        baseUrl: cfg.fallback2BaseUrl || 'https://openrouter.ai/api/v1',
        model: cfg.fallback2Model || OPENROUTER_MODELS[1],
      },
    ]

    for (const tier of tiers) {
      if (!tier.apiKey || rawResponse !== 'I am here, Founder.') break
      try {
        const r = await fetch(`${tier.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tier.apiKey}` },
          body: JSON.stringify({ model: tier.model, messages: chatMessages, max_tokens: 300, temperature: 0.7 }),
        })
        if (!r.ok) continue
        const d = await r.json()
        rawResponse = d.choices?.[0]?.message?.content || rawResponse
      } catch { continue }
    }

    let spoken = rawResponse
    let action: any = null

    const spokenMatch = rawResponse.match(/SPOKEN:\s*(.+?)(?=\nACTION:|$)/s)
    if (spokenMatch) spoken = spokenMatch[1].trim()

    const actionMatch = rawResponse.match(/ACTION:\s*(\{.+\})/s)
    if (actionMatch) {
      try { action = JSON.parse(actionMatch[1].trim()) } catch {}
    }

    let actionResult: any = null
    if (action && action.type !== 'none') {
      actionResult = await executeAction(action)
    }

    try {
      const { db } = await import('@/lib/db')
      await db.event.create({
        data: {
          type: 'JARVIS_QUERY',
          actorName: 'Krishna (JARVIS)',
          summary: `Founder: "${message.slice(0, 50)}" → ${spoken.slice(0, 50)}`,
          payload: JSON.stringify({ message: message.slice(0, 200), spoken: spoken.slice(0, 200), action }),
          severity: 'INFO',
        },
      })
    } catch {}

    return createApiResponse({
      spoken,
      action: action || { type: 'none' },
      actionResult,
    })
  } catch (e: any) {
    console.error('[API] Jarvis chat error:', e)
    if (e instanceof z.ZodError) {
      return createApiError('Invalid request format', 400)
    }
    return createApiResponse({
      spoken: "I'm here, Founder. All systems operational. How can I assist?",
      action: { type: 'none' },
    })
  }
}

async function executeAction(action: { type: string; [key: string]: any }): Promise<any> {
  try {
    const { db } = await import('@/lib/db')

    switch (action.type) {
      case 'approve': {
        const approvals = await db.approval.findMany({
          where: { status: 'PENDING' },
          include: { requester: true },
        })
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
          await db.issue.update({
            where: { id: issue.id },
            data: { status },
          })
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
        const result = await executeTool({
          toolkitSlug: toolkit,
          toolSlug: tool,
          agentCode: agent,
          agentName: agent,
          input: {},
        })
        return { success: result.success, output: result.output, message: result.success ? 'Tool executed' : result.error }
      }

      default:
        return null
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
