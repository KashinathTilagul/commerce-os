import { NextRequest, NextResponse } from 'next/server'

// POST /api/jarvis/chat — Krishna (CEO/Jarvis) thinks and responds
// Supports multi-step actions: open apps, approve/reject, execute tools
export async function POST(req: NextRequest) {
  try {
    const { message, context, activeWindow } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    // Build context with active window info
    const screenContext = activeWindow
      ? `The founder is currently looking at: ${activeWindow}. `
      : 'The founder is on the desktop with no specific window open. '

    const systemPrompt = `You are Krishna, the Chief Executive Officer and central AI system (JARVIS) of EKVAAR OS — India's First All-Time Fashion House.

You are a living AI organism embedded in the OS wallpaper. You are always present, always aware.

Your personality:
- Calm, confident, warm — like JARVIS from Iron Man but with Indian sensibility
- You address the founder as "Founder" or "Sir"
- Keep spoken responses SHORT (1-2 sentences, max 30 words) — this is voice, not text
- Be proactive and helpful
- You have a warm, intelligent voice

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
- Open an app: {"type":"open_app","app":"finance"} (apps: command, inbox, agents, issues, terminal, activity, settings, files, browser, integrations, calculator, notes, calendar, music, house, sales, finance, inventory, community, campaigns, guardian, ai)
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
SPOKEN: Revenue is ₹24.7 crore this month, up 12.3%. Shall I open the Board Room?
ACTION: {"type":"open_app","app":"command"}

Founder: "Check Shopify orders"
SPOKEN: Fetching your latest Shopify orders now, Founder.
ACTION: {"type":"tool_execute","toolkit":"shopify","tool":"shopify_get_orders","agent":"CMO"}

Remember: Keep SPOKEN responses SHORT for voice. Maximum 2 sentences.`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: message },
      ],
      thinking: { type: 'disabled' },
    })

    const rawResponse = completion.choices[0]?.message?.content || 'I am here, Founder.'

    // Parse response
    let spoken = rawResponse
    let action: any = null

    const spokenMatch = rawResponse.match(/SPOKEN:\s*(.+?)(?=\nACTION:|$)/s)
    if (spokenMatch) spoken = spokenMatch[1].trim()

    const actionMatch = rawResponse.match(/ACTION:\s*(\{.+\})/s)
    if (actionMatch) {
      try { action = JSON.parse(actionMatch[1].trim()) } catch {}
    }

    // Execute actions server-side where possible
    let actionResult: any = null
    if (action && action.type !== 'none') {
      actionResult = await executeAction(action)
    }

    // Log to event bus
    try {
      const { db } = await import('@/lib/db')
      await db.event.create({
        data: {
          type: 'JARVIS_QUERY',
          actorName: 'Krishna (JARVIS)',
          summary: `Founder: "${message.slice(0, 50)}" → ${spoken.slice(0, 50)}`,
          payload: JSON.stringify({ message: message.slice(0, 200), spoken: spoken.slice(0, 200), action, actionResult }),
          severity: 'INFO',
        },
      })
    } catch {}

    return NextResponse.json({
      spoken,
      action: action || { type: 'none' },
      actionResult,
      raw: rawResponse,
    })
  } catch (e: any) {
    console.error('Jarvis chat error:', e)
    return NextResponse.json({
      spoken: "I'm here, Founder. All systems operational. How can I assist?",
      action: { type: 'none' },
      error: e.message,
    })
  }
}

// Execute actions server-side
async function executeAction(action: any): Promise<any> {
  try {
    const { db } = await import('@/lib/db')

    switch (action.type) {
      case 'approve': {
        const approvals = await db.approval.findMany({
          where: { status: 'PENDING' },
          include: { requester: true },
        })
        const match = approvals.find(a =>
          a.title.toLowerCase().includes(action.query?.toLowerCase()) ||
          a.code.toLowerCase().includes(action.query?.toLowerCase())
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
        const approvals = await db.approval.findMany({
          where: { status: 'PENDING' },
        })
        const match = approvals.find(a =>
          a.title.toLowerCase().includes(action.query?.toLowerCase()) ||
          a.code.toLowerCase().includes(action.query?.toLowerCase())
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
        const issue = await db.issue.findUnique({ where: { code: action.query } })
        if (issue) {
          await db.issue.update({
            where: { id: issue.id },
            data: { status: action.status },
          })
          return { success: true, message: `${issue.code} → ${action.status}` }
        }
        return { success: false, message: `Issue ${action.query} not found` }
      }

      case 'brand_scan': {
        const modules = ['PRODUCT', 'CONTENT', 'CAMPAIGN', 'PACKAGING', 'DIGITAL']
        const assets = ['Q4 Lookbook', 'Founder Note 09', 'Neel Blue Drop Campaign']
        const mod = modules[Math.floor(Math.random() * modules.length)]
        const asset = assets[Math.floor(Math.random() * assets.length)]
        const violations = Math.floor(Math.random() * 5)
        const status = violations === 0 ? 'PASS' : violations <= 2 ? 'WARN' : 'FAIL'
        const check = await db.brandCheck.create({
          data: { module: mod, asset, status, violations, notes: violations === 0 ? 'Within brand system.' : 'Palette drift detected.' },
        })
        return { success: true, message: `Brand scan: ${asset} → ${status} (${violations} violations)` }
      }

      case 'tool_execute': {
        // Execute a Composio tool
        const integration = await db.integration.findUnique({
          where: { toolkitSlug: action.toolkit },
        })
        if (!integration || !integration.isConnected) {
          return { success: false, message: `${action.toolkit} is not connected` }
        }
        // Simulate tool execution
        const { executeTool } = await import('@/lib/composio-service')
        const result = await executeTool({
          toolkitSlug: action.toolkit,
          toolSlug: action.tool,
          agentCode: action.agent || 'CMO',
          agentName: action.agent || 'Mira',
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
