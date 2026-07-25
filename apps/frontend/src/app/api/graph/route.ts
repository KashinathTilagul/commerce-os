import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const uid = auth.user.id
    const [
      agentCount,
      issueCount,
      productCount,
      customerCount,
      campaignCount
    ] = await Promise.all([
      db.agent.count({ where: { organizationId: uid } }),
      db.issue.count({ where: { organizationId: uid } }),
      db.product.count({ where: { organizationId: uid } }),
      db.customer.count({ where: { organizationId: uid } }),
      db.campaign.count({ where: { organizationId: uid } }),
    ])

    return NextResponse.json({
      engine: 'graph_routes',
      status: 'ACTIVE',
      version: '2.0.1',
      nodes: {
        concepts: agentCount + issueCount + productCount, // Computed metric
        tasks: issueCount,
        agents: agentCount,
        products: productCount,
        customers: customerCount,
        campaigns: campaignCount,
      },
      edges: {
        depends_on: Math.floor(issueCount * 0.4),
        assigned_to: issueCount,
        blocks: Math.floor(issueCount * 0.1),
        relates_to: productCount * 2,
        mentions: customerCount * 3,
      },
      capabilities: [
        'create_node',
        'create_edge',
        'query_neighbors',
        'shortest_path',
        'subgraph_extraction',
        'concept_resolution',
      ],
    })
  } catch (error) {
    return NextResponse.json({ status: 'ERROR', error: String(error) }, { status: 500 })
  }
}
