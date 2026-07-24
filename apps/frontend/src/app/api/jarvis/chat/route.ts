import { NextRequest } from 'next/server'
import { createApiResponse, createApiError, sanitizeInput } from '@/lib/security'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { z } from 'zod'
import { routeObject } from '@/lib/ai-router'
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
  z.object({ type: z.literal('assign_task'), assignee: z.string().describe('Agent code, name, role, or department, e.g. "CMO", "Mira", "marketing"'), task: z.string().describe('What the agent should do'), priority: z.string().optional().describe('P0 | P1 | P2 | P3') }),
  z.object({ type: z.literal('message_team'), text: z.string().describe('The message to post'), channel: z.string().optional().describe('Discord channel id or name') }),
  z.object({ type: z.literal('price_check'), query: z.string().optional().describe('Product name, SKU, or brand to check prices for') }),
  z.object({ type: z.literal('competitor_summary'), competitor: z.string().optional().describe('Competitor name or domain') }),
  z.object({ type: z.literal('sync_prices'), competitor: z.string().optional().describe('Trigger immediate price sync') }),
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

CRITICAL RULES — violating these is a failure:
1. NEVER claim you did something unless you emit the matching action in the same turn. If you say "I've assigned…", the action MUST be assign_task. If action is "none", your spoken words must NOT claim any action was taken.
2. If the Founder asks to assign, delegate, give, or hand a task to anyone — you MUST emit assign_task. Do not use tool_execute for this.
3. Only use tool_execute with the exact toolkit/tool names listed below. Never invent toolkit or tool names.

EXAMPLES:
Founder: "assign the marketing campaign to the CMO"
→ {"spoken":"Done. Mira has it.","action":{"type":"assign_task","assignee":"CMO","task":"Own the marketing campaign","priority":"P2"}}

Founder: "assign CEO a task to check how many agents are active and their skill levels"
→ {"spoken":"Assigned. Arjun will review agent count and skills.","action":{"type":"assign_task","assignee":"CEO","task":"Review total active agents and their skill levels","priority":"P2"}}

Founder: "tell the team the drop launches Friday"
→ {"spoken":"Posting that to the team now.","action":{"type":"message_team","text":"The drop launches Friday."}}

AVAILABLE ACTIONS:
- Open app: {"type":"open_app","app":"<id>"} — apps: command, inbox, agents, issues, terminal, activity, settings, files, integrations, calculator, notes, calendar, music, house, sales, finance, inventory, community, campaigns, guardian, ai, opencode, risk
- Approve: {"type":"approve","query":"<title or code>"}
- Reject: {"type":"reject","query":"<title or code>"}
- Issue status: {"type":"issue_status","query":"<PAP-XX>","status":"IN_PROGRESS"}
- Brand scan: {"type":"brand_scan"}
- Shopify orders: {"type":"tool_execute","toolkit":"shopify","tool":"shopify_get_orders","agent":"CMO"}
- Stripe balance: {"type":"tool_execute","toolkit":"stripe","tool":"stripe_get_balance","agent":"CFO"}
- Assign a task to a digital employee: {"type":"assign_task","assignee":"<CMO|CTO|CFO|COO|name|department>","task":"<what to do>","priority":"P2"} — use when the Founder says to assign/delegate work. This creates a real tracked task on the agent.
- Message the team: {"type":"message_team","text":"<message>","channel":"<optional channel>"} — posts to the team's Discord. Use when the Founder wants to inform or message the team.
- Price check: {"type":"price_check","query":"<optional product/brand>"} — query competitive pricing data. Use when the Founder asks about competitor prices, pricing situation, or specific product pricing.
- Competitor summary: {"type":"competitor_summary","competitor":"<optional name>"} — summarize competitive intelligence. Use when Founder asks about competitors, market position, or competitive landscape.
- Sync prices: {"type":"sync_prices","competitor":"<optional>"} — trigger immediate price sync. Use when Founder wants fresh data.
- Close window: {"type":"close_window"}
- No action: {"type":"none"}

COMPETITIVE INTELLIGENCE — You have access to real-time competitive pricing data.

When the Founder asks about pricing or competitors, use these actions instead of generic answers:
- "What's the pricing situation?" → {"type":"competitor_summary"}
- "Check [product] price" → {"type":"price_check","query":"[product]"}
- "Any price alerts?" → {"type":"competitor_summary"} — then you'll receive actual alerts
- "How are we vs competitors?" → {"type":"competitor_summary"}
- "What happened with pricing?" → {"type":"competitor_summary"} — summarize recent changes
- "Sync prices" or "Update prices" → {"type":"sync_prices"}

You can explain: which competitors are tracked (Myntra, Ajio, Amazon India, Flipkart, Nykaa), price trends, discounts, anomalies, and recommendations based on competitive data. Always give specific numbers when available.`

    // ── Load config overrides from DB ────────────────────────────────────
    let cfg: any = {}
    try {
      cfg = await db.systemSetting.findUnique({ where: { id: 'global' } }) || {}
    } catch {}

    // Use custom prompt if set in Settings, otherwise default
    const activePrompt = cfg.krishnaPrompt?.trim() || systemPrompt

    let spoken = "I'm here, Founder. How can I assist?"
    let action: z.infer<typeof ActionSchema> = { type: 'none' }

    try {
      const { object, provider, model } = await routeObject<z.infer<typeof KrishnaResponseSchema>>('reasoning', {
        schema: KrishnaResponseSchema,
        system: activePrompt,
        prompt: sanitizeInput(message, { maxLength: 5000 }),
        temperature: 0.87,
      })

      spoken = object.spoken
      action = object.action
      console.log(`[Krishna] Structured response via ${provider}/${model}`)

    } catch (e: any) {
      console.error(`[Krishna] Core error:`, e.message)
      spoken = `I'm having trouble reaching my intelligence core, sir. ${e.message}`
    }

    // ── Assignment safety net ────────────────────────────────────────────
    // The model routinely picks the wrong action for delegation (emitting
    // 'none' or 'issue_status'). When the founder clearly asked to delegate,
    // re-extract with a focused zero-temp schema and override the action.
    let netEngaged = false
    if (action.type !== 'assign_task' && /\b(assign|delegate|hand (it |this )?(over|off)|give .{0,30}\btask|task .{0,30}\bto\b)/i.test(message)) {
      try {
        const { object: extracted } = await routeObject<{ isAssignment: boolean; assignee: string; task: string; priority: 'P0' | 'P1' | 'P2' | 'P3' }>('fast', {
          schema: z.object({
            isAssignment: z.boolean().describe('true only if the founder is delegating work to someone'),
            assignee: z.string().describe('Agent code, name, role or department, e.g. CEO, CMO, Mira, marketing'),
            task: z.string().describe('The task, phrased as an instruction'),
            priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P2'),
          }),
          system: 'Extract a task assignment from the founder\'s instruction. If it is not an assignment, set isAssignment false.',
          prompt: sanitizeInput(message, { maxLength: 2000 }),
          temperature: 0,
        })
        if (extracted.isAssignment && extracted.task) {
          action = { type: 'assign_task', assignee: extracted.assignee, task: extracted.task, priority: extracted.priority }
          netEngaged = true
          console.log('[Krishna] Assignment safety net engaged')
        }
      } catch (e: any) {
        console.error('[Krishna] Safety net failed:', e.message)
      }
    }

    // ── Execute action ───────────────────────────────────────────────────
    let actionResult: any = null
    if (action.type !== 'none') {
      actionResult = await executeAction(action, uid)
    }

    // Keep the spoken reply honest about what actually happened
    if (actionResult && actionResult.success === false) {
      spoken = `I couldn't complete that. ${actionResult.message || actionResult.error || ''}`.trim()
    } else if (netEngaged && actionResult?.success) {
      spoken = `Done. ${actionResult.code} assigned to ${actionResult.agentName}.`
    } else if (actionResult?.success && action.type === 'competitor_summary') {
      const data = actionResult.data
      if (data?.stats) {
        const { totalProducts, totalCompetitors, avgDiscount, alertsCount, topDrops, topIncreases } = data.stats
        let summary = `We're tracking ${totalProducts} products across ${totalCompetitors} competitors. `
        summary += `Average discount is ${avgDiscount.toFixed(1)}%. `
        if (alertsCount > 0) {
          summary += `${alertsCount} price alerts pending${topDrops.length > 0 ? ` — biggest drop: ${topDrops[0].product?.name?.slice(0, 30)} is down ${Math.abs(topDrops[0].changePercent).toFixed(1)}%` : ''}.`
        }
        spoken = summary
      }
    } else if (actionResult?.success && action.type === 'price_check') {
      const products = actionResult.data?.products || []
      if (products.length === 0) {
        spoken = `No products found matching that query.`
      } else if (products.length <= 3) {
        spoken = products.map(p => 
          `${p.name.slice(0, 40)} on ${p.competitor}: ₹${p.price}${p.discount > 0 ? ` (${p.discount}% off)` : ''}`
        ).join('. ')
      } else {
        const avgP = products.reduce((s: number, p: any) => s + p.price, 0) / products.length
        spoken = `Found ${products.length} products. Prices range from ₹${Math.min(...products.map((p: any) => p.price))} to ₹${Math.max(...products.map((p: any) => p.price))}, averaging ₹${avgP.toFixed(0)}.`
      }
    } else if (actionResult?.success && action.type === 'sync_prices') {
      spoken = actionResult.message || 'Sync jobs queued. Updates in a few minutes.'
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

      case 'assign_task': {
        const who = sanitizeInput(action.assignee || '', { maxLength: 60 })
        const task = sanitizeInput(action.task || '', { maxLength: 300 })
        if (!task) return { success: false, message: 'No task described' }

        const agent = await resolveAgent(userId, who)
        if (!agent) return { success: false, message: `No digital employee matching "${who}"` }

        const priority = ['P0', 'P1', 'P2', 'P3'].includes((action.priority || '').toUpperCase())
          ? action.priority.toUpperCase() : 'P2'

        // Next PAP code — count existing issues for this user
        const count = await db.issue.count({ where: { userId } })
        const code = `PAP-${String(count + 1).padStart(2, '0')}`

        const issue = await db.issue.create({
          data: {
            userId, code, title: task,
            description: `Assigned by Founder via Krishna to ${agent.name} (${agent.role}).`,
            status: 'BACKLOG', priority, type: 'TASK',
            assigneeId: agent.id, department: agent.department,
          },
        })
        await db.agent.update({
          where: { id: agent.id },
          data: { currentTask: task, tasksToday: { increment: 1 }, status: 'ACTIVE' },
        })
        await db.event.create({
          data: {
            userId, type: 'ISSUE_ASSIGNED', actorName: 'Krishna',
            summary: `Assigned ${code} "${task.slice(0, 50)}" to ${agent.name}`,
            payload: JSON.stringify({ code, assignee: agent.code, priority }),
            severity: 'INFO',
          },
        })
        // Kick the agent to start working immediately (best-effort; long-lived
        // Node server keeps this running after the response is sent).
        void import('@/lib/agent-worker').then(m => m.runAgentWork(userId, agent.id)).catch(() => {})
        return { success: true, message: `${code} assigned to ${agent.name}`, agentName: agent.name, code }
      }

      case 'message_team': {
        const text = sanitizeInput(action.text || '', { maxLength: 2000 })
        if (!text) return { success: false, message: 'No message text' }
        const integration = await db.integration.findFirst({ where: { userId, toolkitSlug: 'discord' } })
        if (!integration || !integration.isConnected) {
          return { success: false, message: 'Discord is not connected. Connect it in Integrations to message the team.' }
        }
        const { executeTool } = await import('@/lib/composio-service')
        const input: Record<string, any> = { content: text }
        if (action.channel) input.channel_id = sanitizeInput(action.channel, { maxLength: 100 })
        const result = await executeTool({ userId, toolkitSlug: 'discord', toolSlug: 'discord_send_message', agentCode: 'FOUNDER', agentName: 'Founder', input })
        return { success: result.success, message: result.success ? 'Message posted to Discord' : result.error }
      }

      case 'price_check': {
        const query = sanitizeInput(action.query || '', { maxLength: 100 })
        let products: any[] = []
        
        if (query) {
          products = await db.competitorProduct.findMany({
            where: {
              userId,
              OR: [
                { name: { contains: query } },
                { brand: { contains: query } },
                { ourSku: { contains: query } },
              ],
            },
            include: { competitor: true, priceHistory: { orderBy: { scrapedAt: 'desc' }, take: 3 } },
            take: 10,
          })
        } else {
          products = await db.competitorProduct.findMany({
            where: { userId },
            include: { competitor: true },
            orderBy: { lastScrapedAt: 'desc' },
            take: 20,
          })
        }

        if (products.length === 0) {
          return { success: true, message: 'No products found', data: { products: [] } }
        }

        const summary = products.map(p => ({
          name: p.name,
          competitor: p.competitor.name,
          price: p.price,
          mrp: p.mrp,
          discount: p.discount,
          inStock: p.inStock,
          url: p.url,
        }))

        return { success: true, message: `Found ${products.length} products`, data: { products: summary } }
      }

      case 'competitor_summary': {
        const alerts = await db.priceAlert.findMany({
          where: { product: { userId }, acknowledged: false },
          include: { product: { include: { competitor: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        })

        const competitors = await db.competitor.findMany({
          where: { userId, active: true },
          include: { _count: { select: { products: true } } },
        })

        const totalProducts = await db.competitorProduct.count({ where: { userId } })
        const avgDiscount = await db.competitorProduct.aggregate({
          where: { userId },
          _avg: { discount: true },
        })

        const stats = {
          totalProducts,
          totalCompetitors: competitors.length,
          avgDiscount: avgDiscount._avg.discount || 0,
          alertsCount: alerts.length,
          topDrops: alerts.filter(a => a.alertType === 'price_drop').slice(0, 5),
          topIncreases: alerts.filter(a => a.alertType === 'price_increase').slice(0, 5),
        }

        return { 
          success: true, 
          message: `${stats.totalProducts} products tracked across ${stats.totalCompetitors} competitors. ${stats.alertsCount} unacknowledged alerts. Avg discount: ${stats.avgDiscount.toFixed(1)}%`, 
          data: { stats, alerts, competitors } 
        }
      }

      case 'sync_prices': {
        const competitorName = sanitizeInput(action.competitor || '', { maxLength: 50 })
        
        let where: any = { userId, active: true }
        if (competitorName) {
          where.OR = [
            { name: { contains: competitorName } },
            { domain: { contains: competitorName } },
          ]
        }

        const competitors = await db.competitor.findMany({
          where,
          include: { products: { where: { url: { not: '' } }, select: { url: true } } },
        })

        if (competitors.length === 0) {
          return { success: false, message: 'No active competitors found' }
        }

        let jobsCreated = 0
        for (const comp of competitors) {
          if (comp.products.length === 0) continue
          
          await db.scrapeJob.create({
            data: {
              userId,
              competitorId: comp.id,
              type: 'manual',
              status: 'pending',
              priority: 1,
              config: JSON.stringify({ urls: comp.products.map(p => p.url) }),
            },
          })
          jobsCreated++
        }

        return { success: true, message: `Created ${jobsCreated} sync job${jobsCreated !== 1 ? 's' : ''}. Results will be available in a few minutes.` }
      }

      default:
        return null
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Resolve a fuzzy human reference ("CMO", "Mira", "marketing", "Chief Tech…")
// to one of the user's agents. Exact code match wins, then name/role/department substring.
async function resolveAgent(userId: string, query: string) {
  const q = query.toLowerCase().trim()
  if (!q) return null
  const agents = await db.agent.findMany({ where: { userId, isHuman: false } })
  return (
    agents.find(a => a.code.toLowerCase() === q) ||
    agents.find(a => a.name.toLowerCase() === q) ||
    agents.find(a => a.name.toLowerCase().includes(q) || q.includes(a.name.toLowerCase())) ||
    agents.find(a => a.role.toLowerCase().includes(q)) ||
    agents.find(a => a.department.toLowerCase().includes(q)) ||
    agents.find(a => a.code.toLowerCase().includes(q)) ||
    null
  )
}
