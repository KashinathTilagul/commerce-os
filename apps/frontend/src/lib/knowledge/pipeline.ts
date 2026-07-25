import { KnowledgeAdapter } from './adapter'
import { RelationshipType } from './types'
import crypto from 'crypto'

export interface PipelineIngestionPayload {
  organizationId: string
  source: string
  sourceProvider: string
  businessObjectType: string
  businessObjectId: string
  rawObject: any
}

export class KnowledgePipeline {
  static generateChecksum(data: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
  }

  static async ingest(payload: PipelineIngestionPayload) {
    // 1. Extract Metadata
    const metadata = this.extractMetadata(payload.businessObjectType, payload.rawObject)
    
    // 2. Generate Summary
    const { title, summary } = this.generateSummary(payload.businessObjectType, payload.rawObject)
    
    // 3. Checksum
    const checksum = this.generateChecksum(payload.rawObject)

    // 4. Construct Node Input
    const nodeInput = {
      organizationId: payload.organizationId,
      type: payload.businessObjectType,
      title,
      summary,
      metadata,
      businessObjectType: payload.businessObjectType,
      businessObjectId: payload.businessObjectId,
      checksum,
      source: payload.source,
      sourceProvider: payload.sourceProvider,
      confidence: 'VERIFIED'
    }

    // 5. Send to Knowledge Adapter
    const { status, node } = await KnowledgeAdapter.upsertNode(nodeInput)

    // 6. Build Relationships
    if (status !== 'UNCHANGED') {
      await this.buildRelationships(node.id, payload)
    }

    return node
  }

  private static extractMetadata(type: string, raw: any) {
    if (type === 'PRODUCT') {
      return { category: raw.category, price: raw.price, stock: raw.stock }
    }
    if (type === 'ORDER') {
      return { total: raw.total, status: raw.status, itemsCount: raw.itemsCount }
    }
    if (type === 'CUSTOMER') {
      return { tier: raw.tier, totalSpent: raw.totalSpent, totalOrders: raw.totalOrders }
    }
    return {}
  }

  private static generateSummary(type: string, raw: any) {
    if (type === 'PRODUCT') {
      return {
        title: raw.name || 'Untitled Product',
        summary: `Product: ${raw.name} | SKU: ${raw.sku} | Price: ${raw.price}`
      }
    }
    if (type === 'ORDER') {
      return {
        title: `Order ${raw.orderNumber}`,
        summary: `Order ${raw.orderNumber} by ${raw.customerName} for ${raw.total}`
      }
    }
    if (type === 'CUSTOMER') {
      return {
        title: raw.name || 'Unknown Customer',
        summary: `Customer: ${raw.name} | Email: ${raw.email} | Tier: ${raw.tier || 'ORIGINAL'}`
      }
    }
    return { title: 'Unknown', summary: '' }
  }

  private static async buildRelationships(nodeId: string, payload: PipelineIngestionPayload) {
    if (payload.businessObjectType === 'ORDER' && payload.rawObject.items) {
      // Create relationships for items (Requires items to be populated in rawObject)
      // Usually, we'd query the DB for actual KnowledgeNode IDs of the products
      // Here, we trust the caller to pass necessary metadata or we do lookups in the adapter.
    }
  }
}
