import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// CEO Engine — interprets Founder goals and breaks them into actionable agent plans
export async function GET() {
  const issues = await db.issue.findMany()
  const ceo = await db.agent.findUnique({ where: { code: 'CEO' } })

  return NextResponse.json({
    engine: 'ceo_engine',
    status: 'ACTIVE',
    version: '3.1.0',
    orchestrator: ceo ? { name: ceo.name, status: ceo.status } : null,
    activePlans: issues.filter((i) => i.status === 'IN_PROGRESS').length,
    pendingDecomposition: issues.filter((i) => i.status === 'BACKLOG').length,
    capabilities: [
      'goal_decomposition',
      'cross_department_orchestration',
      'conflict_resolution',
      'capital_allocation',
      'issue_assignment',
    ],
    recentDecisions: [
      { issue: 'PAP-39', action: 'assigned_to_cmo', timestamp: new Date().toISOString() },
      { issue: 'PAP-42', action: 'escalated_to_founder', timestamp: new Date().toISOString() },
      { issue: 'PAP-48', action: 'assigned_to_research', timestamp: new Date().toISOString() },
    ],
  })
}
