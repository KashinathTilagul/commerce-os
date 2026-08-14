export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { getCogneeGraph } from '@/lib/cognee'

type GraphNode = { id: string; label: string; type: string }
type GraphEdge = { source: string; target: string; label: string }

function normalizeCogneeGraph(payload: any) {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  for (const entry of payload.graphs || []) {
    for (const node of entry.graph?.nodes || []) nodes.push({
      id: String(node.id),
      label: String(node.label || node.name || node.id),
      type: String(node.type || node.properties?.type || 'memory'),
    })
    for (const edge of entry.graph?.edges || []) edges.push({
      source: String(edge.source),
      target: String(edge.target),
      label: String(edge.label || edge.type || 'related'),
    })
  }
  return { nodes: nodes.slice(0, 80), edges: edges.slice(0, 160) }
}

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const cognee = await getCogneeGraph(`ekvaar-${auth.organizationId}`)
    return NextResponse.json({ source: 'cognee', status: cognee.health, ...normalizeCogneeGraph(cognee) })
  } catch (error: any) {
    const [agents, events] = await Promise.all([
      db.agent.findMany({ where: { organizationId: auth.organizationId }, select: { id: true, name: true, department: true, managerId: true }, take: 65 }),
      db.event.findMany({ where: { organizationId: auth.organizationId }, select: { id: true, actorName: true, type: true, summary: true }, orderBy: { timestamp: 'desc' }, take: 30 }),
    ])
    const nodes: GraphNode[] = agents.map((agent) => ({ id: agent.id, label: agent.name, type: agent.department }))
    const edges: GraphEdge[] = agents.flatMap((agent) => agent.managerId ? [{ source: agent.managerId, target: agent.id, label: 'manages' }] : [])
    for (const event of events) {
      const actor = agents.find((agent) => agent.name === event.actorName)
      if (!actor) continue
      nodes.push({ id: event.id, label: event.summary, type: event.type })
      edges.push({ source: actor.id, target: event.id, label: 'recorded' })
    }
    return NextResponse.json({ source: 'event-ledger', degraded: true, reason: error.message, nodes, edges })
  }
}
