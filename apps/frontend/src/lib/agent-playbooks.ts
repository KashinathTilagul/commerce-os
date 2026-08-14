import { db } from './db'
import { getLiveBusinessSnapshot } from './business-snapshot'
import { routeText } from './ai-router'
import { sendAgentEmail } from './agent-email-service'

export interface PlaybookDefinition {
  key: string
  name: string
  description: string
  leadAgentCode: string
  collaboratorCodes: string[]
  cronIntervalHours: number
  sendEmailDigest?: boolean
  generateIssue?: boolean
}

export const PLAYBOOKS: PlaybookDefinition[] = [
  {
    key: 'DAILY_EXECUTIVE_BRIEF',
    name: 'Executive Morning Brief & Financial Memo',
    description: 'CEO Krishna and CFO Dhruv synthesize 24h revenue, net margins, low stock alerts, and unreviewed approvals into an executive founder memo and optional email digest.',
    leadAgentCode: 'CEO',
    collaboratorCodes: ['CFO', 'COO'],
    cronIntervalHours: 24,
    sendEmailDigest: true,
    generateIssue: true,
  },
  {
    key: 'INVENTORY_REORDER_SWEEP',
    name: 'Autonomous Inventory Reorder Sweep',
    description: 'COO Kael and Supply Chain Specialists scan SKU velocity against safety thresholds and auto-draft replenishment tickets.',
    leadAgentCode: 'COO',
    collaboratorCodes: ['OPS_MANAGER', 'FIN_PRICING'],
    cronIntervalHours: 12,
    sendEmailDigest: false,
    generateIssue: true,
  },
  {
    key: 'WEEKLY_BRAND_AUDIT',
    name: 'Weekly Brand Identity & Margin Audit',
    description: 'CCO Zara audits published marketing copy, discounts, and visual assets against brand DNA guidelines.',
    leadAgentCode: 'CCO',
    collaboratorCodes: ['DES_BRAND', 'LEG_COMPLIANCE'],
    cronIntervalHours: 168,
    sendEmailDigest: true,
    generateIssue: true,
  },
  {
    key: 'MARKET_TREND_DIGEST',
    name: 'Market & Seasonal Trend Intelligence',
    description: 'Research Lead Anaya analyzes emerging cultural signals, competitor drops, and color palettes into an actionable brief.',
    leadAgentCode: 'RESEARCH',
    collaboratorCodes: ['DES_STORY', 'MKT_CONTENT'],
    cronIntervalHours: 72,
    sendEmailDigest: false,
    generateIssue: true,
  },
]

export interface PlaybookExecutionResult {
  ok: boolean
  playbookKey: string
  summary: string
  issueId?: string
  emailSent?: boolean
  error?: string
}

/**
 * Execute a specific playbook autonomously for an organization
 */
export async function executePlaybook(
  organizationId: string,
  playbookKey: string
): Promise<PlaybookExecutionResult> {
  const playbook = PLAYBOOKS.find((p) => p.key === playbookKey)
  if (!playbook) {
    return { ok: false, playbookKey, summary: '', error: `Playbook ${playbookKey} not found` }
  }

  try {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      include: { users: { take: 5 } },
    })
    if (!org) return { ok: false, playbookKey, summary: '', error: 'Organization not found' }

    const leadAgent = await db.agent.findFirst({
      where: { organizationId, code: playbook.leadAgentCode },
    })

    const snapshot = await getLiveBusinessSnapshot(organizationId)

    // Synthesize playbook output using AI Router
    const prompt = `You are ${leadAgent?.name || playbook.leadAgentCode} running the autonomous playbook "${playbook.name}" for ${org.name}.
Live business metrics:
- Revenue: ₹${(snapshot.revenue / 100000).toFixed(2)}L
- Orders (30d): ${snapshot.ordersCount}
- Top Products: ${snapshot.topProducts.map((p) => p.title).join(', ') || 'Standard Catalog'}

Generate a concise, actionable executive summary (max 3-4 bullet points) covering status, immediate risks, and recommended founder action.`

    const summary = await routeText(prompt, {
      tier: 'FAST',
      maxTokens: 300,
      temperature: 0.2,
    })

    let createdIssueId: string | undefined

    if (playbook.generateIssue) {
      const issue = await db.issue.create({
        data: {
          organizationId,
          title: `[Playbook: ${playbook.name}] ${new Date().toLocaleDateString()}`,
          description: summary,
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          assigneeId: leadAgent?.id,
        },
      })
      createdIssueId = issue.id
    }

    let emailSent = false
    if (playbook.sendEmailDigest) {
      const founderEmail = org.users[0]?.email
      if (founderEmail) {
        const emailRes = await sendAgentEmail(organizationId, {
          to: founderEmail,
          subject: `[Fashion OS] ${playbook.name} - ${new Date().toLocaleDateString()}`,
          body: summary,
          html: `<div style="font-family: sans-serif; padding: 20px; color: #111;">
            <h2>${playbook.name}</h2>
            <p><strong>Organization:</strong> ${org.name}</p>
            <hr style="border: none; border-top: 1px solid #eee;" />
            <div style="white-space: pre-wrap; line-height: 1.6;">${summary}</div>
            <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;" />
            <p style="font-size: 12px; color: #888;">Generated autonomously by ${leadAgent?.name || 'Digital Employee'} via Fashion OS Playbook Engine.</p>
          </div>`,
        })
        emailSent = emailRes.sent
      }
    }

    return {
      ok: true,
      playbookKey,
      summary,
      issueId: createdIssueId,
      emailSent,
    }
  } catch (err: any) {
    return {
      ok: false,
      playbookKey,
      summary: '',
      error: err?.message || String(err),
    }
  }
}

/**
 * Sweep and evaluate scheduled playbooks across all organizations
 */
export async function runPlaybookSweep(): Promise<number> {
  const orgs = await db.organization.findMany({ select: { id: true } })
  let executedCount = 0

  for (const org of orgs) {
    for (const playbook of PLAYBOOKS) {
      // Check if this playbook ran recently
      const recentRun = await db.issue.findFirst({
        where: {
          organizationId: org.id,
          title: { startsWith: `[Playbook: ${playbook.name}]` },
          createdAt: {
            gte: new Date(Date.now() - playbook.cronIntervalHours * 60 * 60 * 1000),
          },
        },
      })

      if (!recentRun) {
        await executePlaybook(org.id, playbook.key)
        executedCount++
      }
    }
  }

  return executedCount
}
