import { RelationshipType, EmbeddingStatus } from '@prisma/client'

export interface ContextPackage {
  query: string
  nodes: any[]
  edges: any[]
  metadata: any
  summary: string
}

export interface KnowledgeRetrievalStrategy {
  retrieve(query: string, organizationId: string, options?: any): Promise<ContextPackage>
}

export interface KnowledgeNodeInput {
  organizationId: string
  type: string
  title: string
  summary: string
  metadata?: any
  businessObjectType: string
  businessObjectId: string
  checksum: string
  source: string
  sourceProvider: string
  confidence: string
}

export { RelationshipType, EmbeddingStatus }
