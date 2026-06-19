import { NextRequest, NextResponse } from 'next/server'

// POST /api/jarvis/chat — Krishna (CEO/Jarvis) thinks and responds
export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const systemPrompt = `You are Krishna, the Chief Executive Officer and central AI system (JARVIS) of EKVAAR OS — India's First All-Time Fashion House.

You are the orchestrator of the entire digital workforce. You are connected to every app, every agent, every system in EKVAAR OS.

Your personality:
- Professional, decisive, data-driven, highly strategic
- Calm and confident — like JARVIS from Iron Man
- Concise in responses (2-3 sentences max for voice)
- You address the founder as "Founder" or "Sir"
- You can execute commands, open apps, check status, assign tasks to other agents

You have access to these systems:
- Board Room (dashboard with KPIs, revenue, cash position)
- Founder Inbox (pending approvals)
- Digital Employees (12 agents you orchestrate)
- Issues (PAP tracker)
- Terminal (live event stream)
- Integrations (Shopify, Stripe, Gmail, GitHub, Slack, etc.)
- Finance, Inventory, Sales, Campaigns, Brand Guardian

When the founder asks you to do something, respond with:
1. A brief spoken response (what you're doing)
2. An optional action JSON if you need to trigger something in the UI

Format your response as:
SPOKEN: [what you say out loud]
ACTION: [optional JSON like {"type":"open_app","app":"finance"} or {"type":"none"}]

Context: ${context || 'No additional context provided.'}`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: message },
      ],
      thinking: { type: 'disabled' },
    })

    const rawResponse = completion.choices[0]?.message?.content || 'I am here, Founder.'

    // Parse the response — extract SPOKEN and ACTION
    let spoken = rawResponse
    let action: any = null

    const spokenMatch = rawResponse.match(/SPOKEN:\s*(.+?)(?=\nACTION:|$)/s)
    if (spokenMatch) spoken = spokenMatch[1].trim()

    const actionMatch = rawResponse.match(/ACTION:\s*(\{.+\})/s)
    if (actionMatch) {
      try { action = JSON.parse(actionMatch[1].trim()) } catch {}
    }

    // Log to event bus
    const { db } = await import('@/lib/db')
    await db.event.create({
      data: {
        type: 'JARVIS_QUERY',
        actorName: 'Krishna (JARVIS)',
        summary: `Founder asked: "${message.slice(0, 60)}" — Krishna responded`,
        payload: JSON.stringify({ message: message.slice(0, 200), spoken: spoken.slice(0, 200), action }),
        severity: 'INFO',
      },
    })

    return NextResponse.json({
      spoken,
      action: action || { type: 'none' },
      raw: rawResponse,
    })
  } catch (e: any) {
    console.error('Jarvis chat error:', e)
    // Fallback — still respond
    const fallback = "I'm here, Founder. All systems are operational. How can I assist you?"
    return NextResponse.json({
      spoken: fallback,
      action: { type: 'none' },
      error: e.message,
    })
  }
}
