import { db } from '@/lib/db'
import { KnowledgeNodeInput, RelationshipType } from './types'
import { dispatchEvent } from '@/lib/events/dispatcher'

export class KnowledgeAdapter {
  static async upsertNode(input: KnowledgeNodeInput) {
    // 1. Check if node exists and checksum matches
    const existing = await db.knowledgeNode.findUnique({
      where: {
        organizationId_businessObjectType_businessObjectId: {
          organizationId: input.organizationId,
          businessObjectType: input.businessObjectType,
          businessObjectId: input.businessObjectId
        }
      }
    })

    if (existing && existing.checksum === input.checksum) {
      return { status: 'UNCHANGED', node: existing }
    }

    const payload = {
      ...input,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null
    }

    const node = await db.knowledgeNode.upsert({
      where: {
        organizationId_businessObjectType_businessObjectId: {
          organizationId: input.organizationId,
          businessObjectType: input.businessObjectType,
          businessObjectId: input.businessObjectId
        }
      },
      create: payload,
      update: payload
    })

    // Emit event
    await dispatchEvent('KNOWLEDGE_NODE_UPSERTED', 'KNOWLEDGE_ADAPTER', {
      nodeId: node.id,
      organizationId: node.organizationId,
      status: existing ? 'UPDATED' : 'CREATED'
    })

    return { status: existing ? 'UPDATED' : 'CREATED', node }
  }

  static async getNode(id: string, organizationId: string) {
    return await db.knowledgeNode.findFirst({
      where: { id, organizationId }
    })
  }

  static async linkObjects(
    organizationId: string,
    sourceId: string,
    targetId: string,
    type: RelationshipType,
    metadata?: any
  ) {
    const edge = await db.knowledgeEdge.upsert({
      where: {
        organizationId_sourceId_targetId_type: {
          organizationId,
          sourceId,
          targetId,
          type
        }
      },
      create: {
        organizationId,
        sourceId,
        targetId,
        type,
        metadata: metadata ? JSON.stringify(metadata) : null
      },
      update: {
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    })

    return edge
  }

  static async findRelated(nodeId: string, organizationId: string, type?: RelationshipType) {
    const where: any = { organizationId, sourceId: nodeId }
    if (type) where.type = type

    const edges = await db.knowledgeEdge.findMany({
      where,
      include: { targetNode: true }
    })

    return edges.map(e => ({ edge: e, node: e.targetNode }))
  }

  static async removeRelationships(nodeId: string, organizationId: string, type?: RelationshipType) {
    const where: any = { organizationId, OR: [{ sourceId: nodeId }, { targetId: nodeId }] }
    if (type) where.type = type

    const result = await db.knowledgeEdge.deleteMany({ where })
    return result.count
  }

  static async rebuildNode(businessObjectType: string, businessObjectId: string, organizationId: string) {
    // This will trigger the Knowledge Pipeline to re-fetch the business object
    // and re-run ingestion. To be hooked up to KnowledgePipeline.
    await dispatchEvent('KNOWLEDGE_REBUILD_REQUESTED', 'KNOWLEDGE_ADAPTER', {
      businessObjectType,
      businessObjectId,
      organizationId
    })
  }
}
