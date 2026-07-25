import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

// ponytail: no vector store/knowledge graph exists yet, so "memory" is the real
// Event log — every workflow/agent/business action already lands there. Swap
// for a real embeddings pipeline (MemoryEngine) once semantic search is needed.
export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const organizationId = auth.user.id
  const hourAgo = new Date(Date.now() - 3600000)

  const [entities, relationships, totalEvents, recentEvents, events] = await Promise.all([
    db.agent.count({ where: { organizationId } }).then(async n => n
      + await db.issue.count({ where: { organizationId } })
      + await db.order.count({ where: { organizationId } })
      + await db.workspace.count({ where: { organizationId } })),
    db.issueComment.count({ where: { issue: { organizationId } } }).then(async n => n
      + await db.orderItem.count({ where: { order: { organizationId } } })
      + await db.workspaceConnection.count({ where: { workspace: { organizationId } } })),
    db.event.count({ where: { organizationId } }),
    db.event.count({ where: { organizationId, timestamp: { gte: hourAgo } } }),
    db.event.findMany({ where: { organizationId }, orderBy: { timestamp: 'desc' }, take: 50 }),
  ])

  const memories = events.map(e => ({
    id: e.id,
    type: e.type.includes('WORKFLOW') ? 'workflow' : e.type.includes('AGENT') ? 'agent' : 'event',
    title: e.summary,
    description: `${e.actorName} · ${e.type}`,
    severity: e.severity,
    timestamp: e.timestamp,
  }))

  return NextResponse.json({
    stats: { totalEntities: entities, relationships, totalEvents, recentIndexes: recentEvents },
    memories,
  })
}
