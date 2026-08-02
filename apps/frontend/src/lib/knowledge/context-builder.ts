import { KnowledgeRetrievalStrategy, ContextPackage } from './types'
import { db } from '@/lib/db'

export class ContextBuilder {
  private strategy: KnowledgeRetrievalStrategy

  constructor(strategy: KnowledgeRetrievalStrategy) {
    this.strategy = strategy
  }

  async build(query: string, organizationId: string, options?: any): Promise<ContextPackage> {
    const context = await this.strategy.retrieve(query, organizationId, options)
    
    // In the future: Add compression, re-ranking, and formatting here
    
    return context
  }
}

export class SqlRetrievalStrategy implements KnowledgeRetrievalStrategy {
  async retrieve(query: string, organizationId: string, options?: any): Promise<ContextPackage> {
    const where: any = { organizationId }
    
    if (query) {
      where.OR = [
        { title: { contains: query } },
        { summary: { contains: query } }
      ]
    }
    if (options?.type) {
      where.type = options.type
    }

    const seedNodes = await db.knowledgeNode.findMany({
      where,
      take: options?.limit || 10
    })

    const seedIds = seedNodes.map(node => node.id)
    const edges = seedIds.length === 0 ? [] : await db.knowledgeEdge.findMany({
      where: {
        organizationId,
        OR: [{ sourceId: { in: seedIds } }, { targetId: { in: seedIds } }],
      },
      include: { sourceNode: true, targetNode: true },
      take: Math.max((options?.limit || 10) * 4, 20),
    })

    const nodeMap = new Map(seedNodes.map(node => [node.id, node]))
    for (const edge of edges) {
      nodeMap.set(edge.sourceNode.id, edge.sourceNode)
      nodeMap.set(edge.targetNode.id, edge.targetNode)
    }
    const nodes = Array.from(nodeMap.values()).slice(0, Math.max(options?.limit || 10, 20))

    return {
      query,
      nodes,
      edges,
      metadata: { retrievedVia: 'KNOWLEDGE_GRAPH', seedCount: seedNodes.length, count: nodes.length, edgeCount: edges.length },
      summary: `Retrieved a knowledge graph with ${nodes.length} nodes and ${edges.length} relationships.`
    }
  }
}
