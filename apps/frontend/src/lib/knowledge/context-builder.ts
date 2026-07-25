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

    const nodes = await db.knowledgeNode.findMany({
      where,
      take: options?.limit || 10
    })

    return {
      query,
      nodes,
      edges: [], // Would fetch related edges here for sub-graph
      metadata: { retrievedVia: 'SQL', count: nodes.length },
      summary: `Retrieved ${nodes.length} nodes from SQL storage.`
    }
  }
}
