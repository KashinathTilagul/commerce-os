import { db } from '../db'
import { Prisma } from '@prisma/client'

export interface BudgetCheckResult {
  allowed: boolean
  warning: boolean
  hardCapHit: boolean
  message?: string
}

/**
 * Checks token and cost limits for an agent before or after run execution.
 * Hard cap (100%) automatically pauses execution.
 * Warning threshold (80%) logs an alert event.
 */
export async function enforceAgentBudget(
  organizationId: string,
  agentId: string,
  runCostIncrement: number = 0,
): Promise<BudgetCheckResult> {
  const agent = await db.agent.findFirst({
    where: { id: agentId, organizationId },
  })

  if (!agent) return { allowed: false, warning: false, hardCapHit: false, message: 'Agent not found' }

  const currentSpend = Number(agent.tokenSpend || 0) + runCostIncrement
  const budgetLimit = Number(agent.tokenBudget || 50000)

  // Update spend if increment > 0
  if (runCostIncrement > 0) {
    await db.agent.update({
      where: { id: agentId },
      data: { tokenSpend: currentSpend },
    })
  }

  const usagePct = budgetLimit > 0 ? (currentSpend / budgetLimit) * 100 : 0

  if (usagePct >= 100) {
    // Automatically PAUSE agent on hard cap
    await db.agent.update({
      where: { id: agentId },
      data: { status: 'PAUSED' },
    })

    await db.event.create({
      data: {
        organizationId,
        type: 'BUDGET_CAP_EXCEEDED',
        actorId: agent.id,
        actorName: agent.name,
        summary: `Agent ${agent.name} auto-paused: spend (₹${currentSpend.toFixed(2)}) reached hard budget cap (₹${budgetLimit})`,
        severity: 'ERROR',
        payload: JSON.stringify({ spend: currentSpend, limit: budgetLimit }),
      },
    })

    return {
      allowed: false,
      warning: true,
      hardCapHit: true,
      message: `Hard budget cap reached (₹${currentSpend.toFixed(2)} / ₹${budgetLimit}). Agent paused.`,
    }
  }

  if (usagePct >= 80) {
    // Log budget warning
    await db.event.create({
      data: {
        organizationId,
        type: 'BUDGET_WARNING',
        actorId: agent.id,
        actorName: agent.name,
        summary: `Budget warning: Agent ${agent.name} has used ${usagePct.toFixed(0)}% of budget limit`,
        severity: 'WARN',
        payload: JSON.stringify({ usagePct, spend: currentSpend, limit: budgetLimit }),
      },
    })

    return {
      allowed: true,
      warning: true,
      hardCapHit: false,
      message: `Budget warning: ${usagePct.toFixed(0)}% used.`,
    }
  }

  return { allowed: true, warning: false, hardCapHit: false }
}
