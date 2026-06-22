import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// CEO Engine — interprets Founder goals and breaks them into actionable agent plans
export async function GET() {
  try {
    const issues = await db.issue.findMany()
    const ceo = await db.agent.findUnique({ where: { code: 'CEO' } })
    
    // Get real recent events by the CEO, fallback to system events if none exist
    const recentEvents = await db.event.findMany({
      where: { actor: 'CEO' },
      take: 5,
      orderBy: { createdAt: 'desc' }
    })
    
    // Format decisions
    const recentDecisions = recentEvents.length > 0 
      ? recentEvents.map(e => ({
          issue: e.type,
          action: e.action,
          timestamp: e.createdAt.toISOString()
        }))
      : []

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
      recentDecisions,
    })
  } catch (error) {
    return NextResponse.json({ status: 'ERROR', error: String(error) }, { status: 500 })
  }
}
