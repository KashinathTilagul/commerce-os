export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'
import { rememberWithCognee } from '@/lib/cognee'
import { sanitizeInput } from '@/lib/security'

// ponytail: no vector store/knowledge graph exists yet, so "memory" is the real
// Event log — every workflow/agent/business action already lands there. Swap
// for a real embeddings pipeline (MemoryEngine) once semantic search is needed.
export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const organizationId = auth.organizationId
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

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const body = await req.json().catch(() => ({}))
  const content = sanitizeInput(typeof body.content === 'string' ? body.content : '', { maxLength: 20_000 })
  if (!content) return NextResponse.json({ error: 'Memory content is required' }, { status: 400 })
  try {
    const result = await rememberWithCognee(`ekvaar-${auth.organizationId}`, content)
    return NextResponse.json({ accepted: true, source: 'cognee', result }, { status: 202 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 502 })
  }
}
