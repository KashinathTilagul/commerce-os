import { db } from '@/lib/db'

export type Risk = {
  id: string
  category: 'AGENT' | 'OPERATIONAL' | 'INFRASTRUCTURE' | 'COMMERCE'
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  score: number
  metric: string
  current_value: number
  message: string
}

const LEVEL_SCORE: Record<Risk['risk_level'], number> = { CRITICAL: 90, HIGH: 70, MEDIUM: 45, LOW: 20 }

// ponytail: risks are derived live from real tables (Agent/Issue/Order) instead of
// a separate ingestion+signal-detection pipeline — nothing to keep in sync, add a
// dedicated telemetry pipeline if these heuristics stop being enough signal.
export async function computeRisks(organizationId: string): Promise<Risk[]> {
  const risks: Risk[] = []
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

  const [agents, issues, orders, products] = await Promise.all([
    db.agent.findMany({ where: { organizationId, isHuman: false } }),
    db.issue.findMany({ where: { organizationId, status: { not: 'DONE' } } }),
    db.order.findMany({ where: { organizationId, status: 'PROCESSING', createdAt: { lt: threeDaysAgo } } }),
    db.product.findMany({ where: { organizationId, status: 'ACTIVE' } }),
  ])

  for (const a of agents) {
    if (a.tasksTotal >= 5 && a.successRate < 70) {
      const level: Risk['risk_level'] = a.successRate < 50 ? 'CRITICAL' : 'HIGH'
      risks.push({
        id: `agent-lowrate-${a.id}`,
        category: 'AGENT',
        risk_level: level,
        score: LEVEL_SCORE[level],
        metric: 'agent_success_rate',
        current_value: a.successRate,
        message: `${a.name} success rate is ${a.successRate.toFixed(0)}% over ${a.tasksTotal} tasks`,
      })
    }
    if (a.status === 'ACTIVE' && a.lastHeartbeat < dayAgo) {
      risks.push({
        id: `agent-stale-${a.id}`,
        category: 'INFRASTRUCTURE',
        risk_level: 'MEDIUM',
        score: LEVEL_SCORE.MEDIUM,
        metric: 'agent_heartbeat_age_hours',
        current_value: (Date.now() - a.lastHeartbeat.getTime()) / 3600000,
        message: `${a.name} marked ACTIVE but hasn't reported in over 24h`,
      })
    }
  }

  for (const i of issues) {
    if (i.priority === 'P0') {
      risks.push({
        id: `issue-p0-${i.id}`,
        category: 'OPERATIONAL',
        risk_level: 'CRITICAL',
        score: LEVEL_SCORE.CRITICAL,
        metric: 'open_p0_issues',
        current_value: 1,
        message: `P0 issue open: ${i.code} — ${i.title}`,
      })
    } else if (i.priority === 'P1' && i.status === 'BLOCKED') {
      risks.push({
        id: `issue-blocked-${i.id}`,
        category: 'OPERATIONAL',
        risk_level: 'HIGH',
        score: LEVEL_SCORE.HIGH,
        metric: 'blocked_p1_issues',
        current_value: 1,
        message: `P1 issue blocked: ${i.code} — ${i.title}`,
      })
    }
  }

  for (const o of orders) {
    risks.push({
      id: `order-stuck-${o.id}`,
      category: 'OPERATIONAL',
      risk_level: 'MEDIUM',
      score: LEVEL_SCORE.MEDIUM,
      metric: 'stuck_order_days',
      current_value: (Date.now() - o.createdAt.getTime()) / 86400000,
      message: `Order ${o.orderNumber} stuck in PROCESSING for ${Math.floor((Date.now() - o.createdAt.getTime()) / 86400000)}+ days`,
    })
  }

  for (const p of products) {
    if (p.stock <= p.reorderAt) {
      const level: Risk['risk_level'] = p.stock === 0 ? 'CRITICAL' : 'HIGH'
      risks.push({
        id: `product-stockout-${p.id}`,
        category: 'COMMERCE',
        risk_level: level,
        score: LEVEL_SCORE[level],
        metric: 'stockout_risk',
        current_value: p.stock,
        message: `${p.name} (${p.sku}) at ${p.stock} units, reorder point is ${p.reorderAt}`,
      })
    }
    if (p.price > 0) {
      const marginPct = ((p.price - p.cost) / p.price) * 100
      if (marginPct < 20) {
        risks.push({
          id: `product-margin-${p.id}`,
          category: 'COMMERCE',
          risk_level: marginPct < 0 ? 'CRITICAL' : 'MEDIUM',
          score: marginPct < 0 ? LEVEL_SCORE.CRITICAL : LEVEL_SCORE.MEDIUM,
          metric: 'margin_compression',
          current_value: marginPct,
          message: `${p.name} (${p.sku}) margin is ${marginPct.toFixed(0)}%`,
        })
      }
    }
  }

  const resolved = await db.event.findMany({
    where: { organizationId, type: 'RISK_RESOLVED' },
    select: { payload: true },
  })
  const resolvedIds = new Set(resolved.map(r => JSON.parse(r.payload).riskId))

  return risks.filter(r => !resolvedIds.has(r.id)).sort((a, b) => b.score - a.score)
}
