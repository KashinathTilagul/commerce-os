import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

// POST /api/events/generate — generates a simulated agent heartbeat event
const EVENT_TEMPLATES = [
  { type: 'AGENT_HEARTBEAT', actor: 'CMO', summary: 'Mira completed daily metrics review — ROAS up 3.2%', severity: 'INFO' },
  { type: 'AGENT_HEARTBEAT', actor: 'CTO', summary: 'Vega monitoring API latency — 142ms avg', severity: 'INFO' },
  { type: 'AGENT_HEARTBEAT', actor: 'COO', summary: 'Kai checked inventory levels — all houses within bounds', severity: 'INFO' },
  { type: 'BUDGET_WARNING', actor: 'CFO', summary: 'Growth agent token spend crossed 75% threshold', severity: 'WARN' },
  { type: 'ISSUE_ASSIGNED', actor: 'CEO', summary: 'Aria assigned new issue to Research agent', severity: 'INFO' },
  { type: 'AGENT_HEARTBEAT', actor: 'CCO', summary: 'Lumen generated 3 new campaign asset variants', severity: 'INFO' },
  { type: 'AGENT_HEARTBEAT', actor: 'CSM', summary: 'Sage resolved 2 customer support tickets', severity: 'INFO' },
  { type: 'ISSUE_CREATED', actor: 'CEO', summary: 'Aria created new strategic issue for Q4 planning', severity: 'INFO' },
  { type: 'AGENT_HEARTBEAT', actor: 'GROWTH', summary: 'Pulse launched A/B test variant C on checkout', severity: 'INFO' },
  { type: 'BUDGET_WARNING', actor: 'CFO', summary: 'CMO budget utilization at 82% — approaching threshold', severity: 'WARN' },
  { type: 'AGENT_HEARTBEAT', actor: 'RESEARCH', summary: 'Atlas compiled competitive intel report on 3 brands', severity: 'INFO' },
  { type: 'AGENT_HEARTBEAT', actor: 'LEGAL', summary: 'Vera reviewed Q4 campaign copy — no liability', severity: 'INFO' },
  { type: 'AGENT_HEARTBEAT', actor: 'HR', summary: 'Iris monitoring inter-agent communication — alignment nominal', severity: 'INFO' },
  { type: 'APPROVAL_REQUESTED', actor: 'CMO', summary: 'Mira requesting budget increase for Restoration Series', severity: 'WARN' },
  { type: 'AGENT_HEARTBEAT', actor: 'CTO', summary: 'Vega deployed hotfix to payment webhook', severity: 'INFO' },
]

const AGENT_NAMES: Record<string, string> = {
  CMO: 'Mira', CTO: 'Vega', COO: 'Kai', CFO: 'Anya', CCO: 'Lumen',
  CSM: 'Sage', CEO: 'Aria', GROWTH: 'Pulse', RESEARCH: 'Atlas',
  LEGAL: 'Vera', HR: 'Iris',
}

export async function POST() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)]
  const actorName = AGENT_NAMES[template.actor] || template.actor

  const event = await db.event.create({
    data: {
      userId: auth.user.id,
      type: template.type,
      actorName,
      summary: template.summary,
      payload: JSON.stringify({ source: 'heartbeat_engine', run_id: `run_${Date.now()}` }),
      severity: template.severity,
    },
  })

  return NextResponse.json(event)
}
