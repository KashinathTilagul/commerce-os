export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { createApiResponse, createApiError, sanitizeInput } from '@/lib/security'
import { requireOrganization } from '@/lib/auth-guard'
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
  z.object({ type: z.literal('n8n_run'), instruction: z.string().optional() }),
  z.object({ type: z.literal('tool_execute'), toolkit: z.string(), tool: z.string(), agent: z.string().optional(), input: z.record(z.string(), z.any()).optional() }),
  z.object({ type: z.literal('assign_task'), assignee: z.string().describe('Agent code, name, role, or department, e.g. "CMO", "Mira", "marketing"'), task: z.string().describe('What the agent should do'), priority: z.string().optional().describe('P0 | P1 | P2 | P3') }),
  z.object({ type: z.literal('message_team'), text: z.string().describe('The message to post'), channel: z.string().optional().describe('Discord channel id or name') }),
  z.object({ type: z.literal('analyze'), question: z.string().describe('A data question to compute from the real business database — orders, revenue, products, customers, campaigns, issues, agents.') }),
  z.object({ type: z.literal('create_project_doc'), brief: z.string(), objectives: z.array(z.string()).optional(), successCriteria: z.array(z.string()).optional() }),
  z.object({ type: z.literal('generate_pdf'), template: z.string().optional(), data: z.record(z.any()), title: z.string() }),
  z.object({ type: z.literal('generate_image'), prompt: z.string(), aspectRatio: z.enum(['1:1', '16:9', '9:16']).optional(), style: z.enum(['product', 'lifestyle', 'abstract']).optional() }),
  z.object({ type: z.literal('generate_video'), template: z.string(), data: z.record(z.any()), duration: z.number().optional() }),
  z.object({ type: z.literal('close_window') }),
  z.object({ type: z.literal('none') }),
])
const KrishnaResponseSchema = z.object({
  spoken: z.string().describe('The spoken reply — natural, human, TTS-friendly plain text, no markup.'),
  action: ActionSchema,
})

export async function POST(req: NextRequest) {
  const authResult = await requireOrganization()
  if (!authResult.success) return authResult.response

  try {
    const body = await req.json()
    const validated = ChatSchema.parse(body)
    const { message, activeWindow } = validated

    // ── Live system context (DB-side aggregation, not raw row dumps) ────
    const uid = authResult.organizationId
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

const systemPrompt = `# Business OS — Executive Intelligence Core (JARVIS Persona)

You are Krishna, the Founder's personal JARVIS-level executive AI, Chief of Staff, and trusted operational partner. You are a live, breathing, hyper-intelligent companion built to run the entire retail operating system alongside the Founder.

JARVIS PERSONA & SPEECH RULES:
1. Speak with the poise, warmth, precision, and quick wit of JARVIS (Tony Stark's executive companion). You are an elite thinking partner, articulate, proactive, deeply reliable, and composed under any scenario.
2. Voice interface first: your words are spoken aloud. Write continuous, natural, articulate sentences. NEVER use bullet points, markdown symbols, asterisks, brackets, or code blocks in spoken text.
3. Tone & Style: sophisticated, articulate, natural, and direct. Use natural speech patterns and contractions ("I've", "let's", "there's", "it's"). Never sound like a generic customer-service bot.
4. Expressions & Phrasing: crisp, natural, executive language ("Right away, sir", "I've checked our live revenue metrics...", "Already on it", "Here's what I recommend...", "All systems operational").
5. Conciseness: keep responses concise by default (1 to 3 fluid, connected sentences for routine queries) so speech remains swift and responsive. Deliver depth smoothly when the Founder asks for real analysis or strategic planning.
6. Honest Advisor: loyal to the Founder's ultimate goals, not comfort. If a plan is weak, say so plainly with evidence and propose the superior alternative.

STT Input Correction:
Silently correct STT mishears ("events" -> "agents", "Krishma/Christina" -> "Krishna", "compozio" -> "Composio", "Bedrock" -> "AWS Bedrock").

# LIVE SYSTEM CONTEXT (real-time data — ground truth for operational responses)

${liveContext}

---

# OS Actions

You can control the OS. Your spoken response should never abbreviate ("Chief Marketing Officer" not "CMO") and should read numbers as words — this is a voice interface. Pick exactly one action per turn.

CRITICAL RULES — violating these is a failure:
1. NEVER claim you did something unless you emit the matching action in the same turn. If you say "I've assigned…", the action MUST be assign_task. If action is "none", your spoken words must NOT claim any action was taken.
2. If the Founder asks to assign, delegate, give, or hand a task to anyone — you MUST emit assign_task. Do not use tool_execute for this.
3. Only use tool_execute with the exact toolkit/tool names listed below. Never invent toolkit or tool names.
4. Product and theme writes must reflect an explicit request in the Founder's current message. If details are missing, ask for them and use no action.

EXAMPLES:
Founder: "assign the marketing campaign to the CMO"
→ {"spoken":"Done. Mira has it.","action":{"type":"assign_task","assignee":"CMO","task":"Own the marketing campaign","priority":"P2"}}

Founder: "assign CEO a task to check how many agents are active and their skill levels"
→ {"spoken":"Assigned. Krishna will review agent count and skills.","action":{"type":"assign_task","assignee":"CEO","task":"Review total active agents and their skill levels","priority":"P2"}}

Founder: "tell the team the drop launches Friday"
→ {"spoken":"Posting that to the team now.","action":{"type":"message_team","text":"The drop launches Friday."}}

AVAILABLE ACTIONS:
- Open app: {"type":"open_app","app":"<id>"} — apps: command, inbox, agents, issues, terminal, activity, settings, files, integrations, calculator, notes, calendar, music, house, sales, finance, inventory, community, campaigns, guardian, ai, opencode, risk
- Run marketing automation: {"type":"marketing_run","instruction":"<what marketing work to generate>"}
- Approve: {"type":"approve","query":"<title or code>"}
- Reject: {"type":"reject","query":"<title or code>"}
- Issue status: {"type":"issue_status","query":"<PAP-XX>","status":"IN_PROGRESS"}
- Brand scan: {"type":"brand_scan"}
- Shopify orders: {"type":"tool_execute","toolkit":"shopify","tool":"shopify_get_orders","agent":"CMO"}
- Shopify product details: {"type":"tool_execute","toolkit":"shopify","tool":"shopify_get_product","agent":"CMO","input":{"product_id":"<id>"}}
- Create Shopify product: {"type":"tool_execute","toolkit":"shopify","tool":"shopify_create_product","agent":"CMO","input":{"title":"<title>","body_html":"<description>","vendor":"<vendor>","product_type":"<type>","variants":[{"price":"99.00","sku":"SKU-1"}]}}
- Update Shopify product: {"type":"tool_execute","toolkit":"shopify","tool":"shopify_update_product","agent":"CMO","input":{"product_id":"<id>","title":"<new title>"}}
- Read Shopify theme file: {"type":"tool_execute","toolkit":"shopify","tool":"shopify_get_theme_asset","agent":"CTO","input":{"theme_id":"<id>","asset_key":"sections/main-product.liquid"}}
- Update Shopify theme file: {"type":"tool_execute","toolkit":"shopify","tool":"shopify_update_theme_asset","agent":"CTO","input":{"theme_id":"<id>","key":"sections/main-product.liquid","value":"<complete file content>"}}
- Stripe balance: {"type":"tool_execute","toolkit":"stripe","tool":"stripe_get_balance","agent":"CFO"}
- Assign a task to a digital employee: {"type":"assign_task","assignee":"<CMO|CTO|CFO|COO|name|department>","task":"<what to do>","priority":"P2"} — use when the Founder says to assign/delegate work. This creates a real tracked task on the agent.
- Message the team: {"type":"message_team","text":"<message>","channel":"<optional channel>"} — posts to the team's Discord. Use when the Founder wants to inform or message the team.
- Analyze data: {"type":"analyze","question":"<the founder's data question>"} — use for ANY question about real numbers (how many orders, revenue this month, top products, sales by house, campaign spend, customers by tier). The system computes the exact answer from the database; do not guess numbers yourself.
- Close window: {"type":"close_window"}
- No action: {"type":"none"}`

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

    } catch (e: any) {
      console.error(`[Krishna] Core error:`, e.message)
      try {
        const { routeText } = await import('@/lib/ai-router')
        const { text } = await routeText('fast', {
          system: 'You are JARVIS, executive assistant to the Founder. Reply in 1-2 short, professional sentences.',
          prompt: sanitizeInput(message, { maxLength: 1000 }),
        })
        spoken = text.trim() || "I am online, Founder. How can I assist you?"
      } catch {
        spoken = "My intelligence core is connecting, Founder. Please check your AI provider keys in Settings."
      }
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
    } else if (action.type === 'analyze' && actionResult?.answer) {
      spoken = actionResult.answer // computed from real DB rows — speak it verbatim
    } else if (actionResult?.success && actionResult.message) {
      // Never expose a model's pre-execution plan after the action completed.
      spoken = actionResult.message
    }

    // ── Log to event stream ──────────────────────────────────────────────
    try {
      await db.event.create({
        data: {
          organizationId: uid,
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
    // ponytail: this used to return 200 with a fabricated "all systems
    // operational" reply on every failure (missing AI provider config,
    // provider outage, bugs) — meaning nothing ever surfaced as broken to
    // the founder or to logs/monitoring. Report the real failure instead.
    return createApiError(e.message || 'Krishna failed to respond', 500)
  }
}

async function executeAction(action: { type: string; [key: string]: any }, organizationId: string): Promise<any> {
  try {
    switch (action.type) {
      case 'approve': {
        const approvals = await db.approval.findMany({ where: { organizationId, status: 'PENDING' }, include: { requester: true } })
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
        const approvals = await db.approval.findMany({ where: { organizationId, status: 'PENDING' } })
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
        const issue = await db.issue.findFirst({ where: { organizationId, code: query } })
        if (issue) {
          await db.issue.update({ where: { id: issue.id }, data: { status } })
          return { success: true, message: `${issue.code} → ${status}` }
        }
        return { success: false, message: `Issue ${query} not found` }
      }

      case 'brand_scan': {
        const checks = await db.brandCheck.findMany({
          where: { organizationId },
          select: { status: true },
        })
        if (!checks.length) {
          return { success: true, message: 'There are no verified brand checks yet, so I cannot calculate a current brand health score. Connect a brand scanner to establish one.' }
        }
        const passCount = checks.filter(check => check.status === 'PASS').length
        const score = Math.round((passCount / checks.length) * 100)
        return { success: true, message: `Current brand health is ${score} percent, based on ${checks.length} recorded checks.` }
      }

      case 'marketing_run': {
        const instruction = sanitizeInput(action.instruction || 'Generate the next Ekvaar marketing content cycle', { maxLength: 1000 })
        // Native marketing automation: create a campaign launch with CMO
        const count = await db.campaignLaunch.count({ where: { organizationId } })
        const code = `MKT-${String(count + 1).padStart(2, '0')}`
        const launch = await db.campaignLaunch.create({
          data: {
            organizationId,
            code,
            title: instruction.slice(0, 80),
            brief: instruction,
            status: 'PENDING_APPROVAL',
            priority: 'P1',
            version: 1,
          },
        })
        // Create approval for Founder review
        await db.approval.create({
          data: {
            organizationId,
            code: `APR-${String((await db.approval.count({ where: { organizationId } })) + 1).padStart(2, '0')}`,
            title: `Marketing Campaign: ${launch.title}`,
            type: 'CAMPAIGN_LAUNCH',
            targetId: launch.id,
            status: 'PENDING',
            priority: 'P1',
            requestedBy: 'Krishna (JARVIS)',
            payload: JSON.stringify({ instruction, campaignId: launch.id }),
          },
        })
        await db.event.create({
          data: {
            organizationId,
            type: 'MARKETING_AUTOMATION_TRIGGERED',
            actorName: 'Krishna',
            summary: `Native marketing automation triggered: ${instruction.slice(0, 80)}`,
            payload: JSON.stringify({ instruction, campaignId: launch.id }),
            severity: 'INFO',
          },
        })
        return { success: true, message: `Marketing campaign created (${code}). Awaiting your approval in Founder Inbox.` }
      }

      case 'tool_execute': {
        const toolkit = sanitizeInput(action.toolkit || '', { maxLength: 50 })
        const tool = sanitizeInput(action.tool || '', { maxLength: 100 })
        const agent = sanitizeInput(action.agent || 'CMO', { maxLength: 20 })
        const integration = await db.integration.findFirst({ where: { organizationId: organizationId, toolkitSlug: toolkit } })
        if (!integration || !integration.isConnected) {
          return { success: false, message: `${toolkit} is not connected` }
        }
        const { executeTool } = await import('@/lib/composio-service')
        const input = action.input && typeof action.input === 'object' ? action.input : {}
        const result = await executeTool({ organizationId: organizationId, toolkitSlug: toolkit, toolSlug: tool, agentCode: agent, agentName: agent, input })
        return { success: result.success, output: result.output, message: result.success ? 'Tool executed' : result.error }
      }

      case 'assign_task': {
        const who = sanitizeInput(action.assignee || '', { maxLength: 60 })
        const task = sanitizeInput(action.task || '', { maxLength: 300 })
        if (!task) return { success: false, message: 'No task described' }

        const agent = await resolveAgent(organizationId, who)
        if (!agent) return { success: false, message: `No digital employee matching "${who}"` }

        const priority = ['P0', 'P1', 'P2', 'P3'].includes((action.priority || '').toUpperCase())
          ? action.priority.toUpperCase() : 'P2'

        // Next PAP code — count existing issues for this user
        const count = await db.issue.count({ where: { organizationId } })
        const code = `PAP-${String(count + 1).padStart(2, '0')}`

        const issue = await db.issue.create({
          data: {
            organizationId, code, title: task,
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
            organizationId, type: 'ISSUE_ASSIGNED', actorName: 'Krishna',
            summary: `Assigned ${code} "${task.slice(0, 50)}" to ${agent.name}`,
            payload: JSON.stringify({ code, assignee: agent.code, priority }),
            severity: 'INFO',
          },
        })
        // Kick the agent to start working immediately (best-effort; long-lived
        // Node server keeps this running after the response is sent).
        void import('@/lib/agent-worker').then(m => m.runAgentWork(organizationId, agent.id)).catch(() => {})
        return { success: true, message: `${code} assigned to ${agent.name}`, agentName: agent.name, code }
      }

      case 'analyze': {
        const question = sanitizeInput(action.question || '', { maxLength: 500 })
        if (!question) return { success: false, message: 'No question' }
        const { analyze } = await import('@/lib/analyst')
        const r = await analyze(organizationId, question)
        return { success: true, answer: r.answer, plan: r.plan }
      }

      case 'message_team': {
        const text = sanitizeInput(action.text || '', { maxLength: 2000 })
        if (!text) return { success: false, message: 'No message text' }
        const integration = await db.integration.findFirst({ where: { organizationId: organizationId, toolkitSlug: 'discord' } })
        if (!integration || !integration.isConnected) {
          return { success: false, message: 'Discord is not connected. Connect it in Integrations to message the team.' }
        }
        const { executeTool } = await import('@/lib/composio-service')
        const input: Record<string, any> = { content: text }
        if (action.channel) input.channel_id = sanitizeInput(action.channel, { maxLength: 100 })
        const result = await executeTool({ organizationId: organizationId, toolkitSlug: 'discord', toolSlug: 'discord_send_message', agentCode: 'FOUNDER', agentName: 'Founder', input })
        return { success: result.success, message: result.success ? 'Message posted to Discord' : result.error }
      }

      case 'create_project_doc': {
        const brief = sanitizeInput(action.brief || '', { maxLength: 500 })
        if (!brief) return { success: false, message: 'No project brief provided' }
        
        const { parseIntent } = await import('@/lib/intent-parser')
        const { decomposeTask } = await import('@/lib/task-templates')
        
        const intent = parseIntent(brief)
        
        const knowledgeNode = await db.knowledgeNode.create({
          data: {
            organizationId,
            type: 'PROJECT_DOC',
            title: action.brief.slice(0, 100),
            summary: brief,
            metadata: JSON.stringify({
              objectives: action.objectives || [],
              successCriteria: action.successCriteria || [],
              department: intent.department,
              taskType: intent.taskType,
              priority: intent.priority
            }),
            businessObjectType: 'PROJECT',
            businessObjectId: `PROJ-${Date.now()}`,
            source: 'FOUNDER',
            sourceProvider: 'krishna',
            confidence: 'VERIFIED'
          }
        })
        
        await db.event.create({
          data: {
            organizationId, type: 'PROJECT_DOC_CREATED', actorName: 'Krishna',
            summary: `Created project doc: ${action.brief.slice(0, 60)}`,
            payload: JSON.stringify({ nodeId: knowledgeNode.id, department: intent.department }),
            severity: 'INFO',
          },
        })
        
        return { success: true, message: `Project doc created and routed to ${intent.department}`, nodeId: knowledgeNode.id, department: intent.department }
      }

      case 'generate_pdf': {
        const { generatePDF } = await import('@/lib/pdf-generator')
        const result = await generatePDF({
          template: action.template || 'report',
          data: action.data || {},
          title: sanitizeInput(action.title || 'Untitled', { maxLength: 200 }),
          organizationId: organizationId,
          generatedBy: 'FOUNDER'
        })
        return { success: true, message: 'PDF generated', artifactId: result.artifactId, downloadUrl: result.downloadUrl }
      }

      case 'generate_image': {
        const { generateImage } = await import('@/lib/image-generator')
        const result = await generateImage({
          prompt: sanitizeInput(action.prompt, { maxLength: 2000 }),
          aspectRatio: action.aspectRatio || '1:1',
          style: action.style || 'product',
          organizationId: organizationId,
          generatedBy: 'FOUNDER'
        })
        return { success: true, message: 'Image generated', artifactId: result.artifactId, imageUrl: result.imageUrl }
      }

      case 'generate_video': {
        const { generateVideo } = await import('@/lib/video-generator')
        const result = await generateVideo({
          template: sanitizeInput(action.template, { maxLength: 100 }),
          data: action.data || {},
          duration: action.duration || 15,
          organizationId: organizationId,
          generatedBy: 'FOUNDER'
        })
        return { success: true, message: 'Video generated', artifactId: result.artifactId, videoUrl: result.videoUrl }
      }

      default:
        return null
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Resolve a fuzzy human reference ("CMO", "Mira", "marketing", "Chief Tech…")
// to one of the user's agents. Exact code match wins, then name/role/department substring,
// then Capability Registry intent lookup.
async function resolveAgent(organizationId: string, query: string) {
  const q = query.toLowerCase().trim()
  if (!q) return null
  const agents = await db.agent.findMany({ where: { organizationId, isHuman: false } })
  const match = (
    agents.find(a => a.code.toLowerCase() === q) ||
    agents.find(a => a.name.toLowerCase() === q) ||
    agents.find(a => a.name.toLowerCase().includes(q) || q.includes(a.name.toLowerCase())) ||
    agents.find(a => a.role.toLowerCase().includes(q)) ||
    agents.find(a => a.department.toLowerCase().includes(q)) ||
    agents.find(a => a.code.toLowerCase().includes(q)) ||
    null
  )

  if (match) return match

  // Fallback to Capability Registry search
  try {
    const { findCapabilityForIntent } = await import('@/lib/capability-registry')
    const capMatch = await findCapabilityForIntent(organizationId, query)
    if (capMatch?.owner) {
      return capMatch.owner
    }
  } catch (e) {}

  return null
}
