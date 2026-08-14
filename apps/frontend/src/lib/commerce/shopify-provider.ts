import { CommerceProvider, SyncOptions, SyncResult } from './provider'
import { executeTool } from '@/lib/composio-service'

function getCollection(output: any, key: string): any[] {
  if (Array.isArray(output)) return output
  if (Array.isArray(output?.[key])) return output[key]
  if (Array.isArray(output?.data?.[key])) return output.data[key]
  return []
}

export class ShopifyProvider implements CommerceProvider {
  providerName = 'shopify'

  async healthCheck(): Promise<boolean> {
    // Basic connectivity check can be done via Composio, or assumed true if toolkit is active
    return true
  }

  supports(feature: string): boolean {
    const supported = ['products', 'orders', 'customers', 'inventory']
    return supported.includes(feature)
  }

  async connect(): Promise<boolean> {
    // Authentication is handled via Composio UI flow. 
    return true
  }

  async disconnect(): Promise<boolean> {
    // Unlink handled via Composio Integration panel.
    return true
  }

  async syncProducts(options: SyncOptions): Promise<SyncResult> {
    const result = await executeTool({
      organizationId: options.organizationId,
      toolkitSlug: 'shopify',
      toolSlug: 'shopify_get_products',
      agentCode: 'FOUNDER', // Using Founder as the default agent for system syncs
      agentName: 'System',
      input: { limit: options.limit || 250, since_id: options.cursor },
    })

    if (!result.success) {
      throw new Error(`Shopify Provider Error: ${result.error}`)
    }

    const limit = options.limit || 250
    const items = getCollection(result.output, 'products')
    return {
      items,
      hasMore: items.length === limit,
      nextCursor: items.length > 0 ? items[items.length - 1].id.toString() : undefined,
    }
  }

  async syncOrders(options: SyncOptions): Promise<SyncResult> {
    const result = await executeTool({
      organizationId: options.organizationId,
      toolkitSlug: 'shopify',
      toolSlug: 'shopify_get_orders',
      agentCode: 'FOUNDER',
      agentName: 'System',
      input: { status: 'any', limit: options.limit || 250, since_id: options.cursor },
    })

    if (!result.success) {
      throw new Error(`Shopify Provider Error: ${result.error}`)
    }

    const limit = options.limit || 250
    const items = getCollection(result.output, 'orders')
    return {
      items,
      hasMore: items.length === limit,
      nextCursor: items.length > 0 ? items[items.length - 1].id.toString() : undefined,
    }
  }

  async syncCustomers(options: SyncOptions): Promise<SyncResult> {
    const result = await executeTool({
      organizationId: options.organizationId,
      toolkitSlug: 'shopify',
      toolSlug: 'shopify_get_customers',
      agentCode: 'FOUNDER',
      agentName: 'System',
      input: { limit: options.limit || 250, since_id: options.cursor },
    })

    if (!result.success) {
      throw new Error(`Shopify Provider Error: ${result.error}`)
    }

    const limit = options.limit || 250
    const items = getCollection(result.output, 'customers')
    return {
      items,
      hasMore: items.length === limit,
      nextCursor: items.length > 0 ? items[items.length - 1].id.toString() : undefined,
    }
  }

  async syncInventory(options: SyncOptions): Promise<SyncResult> {
    return { items: [], hasMore: false }
  }

  async webhook(payload: any): Promise<void> {
    // Handle incoming webhooks mapped to this provider
  }
}
