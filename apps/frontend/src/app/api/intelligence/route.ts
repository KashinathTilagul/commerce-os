import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const aiSystems = await db.aISystem.findMany({ where: { organizationId: auth.organizationId } })
    
    // Compute total tasks to represent "tokens" or usage abstractly
    const totalTasks = aiSystems.reduce((sum, sys) => sum + sys.tasksTotal, 0)
    const healthySystems = aiSystems.filter(sys => sys.health > 90).length

    return NextResponse.json({
      engine: 'intelligence_layer',
      status: healthySystems === aiSystems.length ? 'ACTIVE' : 'DEGRADED',
      version: '4.2.0',
      primaryModel: 'claude-sonnet-4.5',
      fallbackModel: 'glm-4',
      endpoints: {
        chat: '/api/v1/intelligence/chat',
        embed: '/api/v1/intelligence/embed',
        route: '/api/v1/intelligence/route',
      },
      routing: {
        strategy: 'cost_optimized',
        maxTokensPerCall: 8192,
        dailyTokenBudget: 5000000,
        dailyTokensUsed: totalTasks * 1000, // Derived from DB
      },
      capabilities: [
        'model_routing',
        'context_compression',
        'skill_injection',
        'memory_retrieval',
        'streaming_response',
        'cost_tracking',
      ],
    })
  } catch (error) {
    return NextResponse.json({ status: 'ERROR', error: String(error) }, { status: 500 })
  }
}
