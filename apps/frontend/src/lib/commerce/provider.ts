export interface SyncResult {
  items: any[]
  hasMore: boolean
  nextCursor?: string
}

export interface SyncOptions {
  cursor?: string
  limit?: number
  organizationId: string
}

export interface CommerceProvider {
  providerName: string

  healthCheck(): Promise<boolean>
  supports(feature: string): boolean

  connect(): Promise<boolean>
  disconnect(): Promise<boolean>

  syncProducts(options: SyncOptions): Promise<SyncResult>
  syncOrders(options: SyncOptions): Promise<SyncResult>
  syncCustomers(options: SyncOptions): Promise<SyncResult>
  syncInventory(options: SyncOptions): Promise<SyncResult>

  webhook(payload: any): Promise<void>
}
