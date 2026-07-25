// @ts-nocheck
import { CommerceProvider } from './provider'
import { CommerceHub } from './hub'
import { db } from '@/lib/db'
import { dispatchEvent } from '@/lib/events/dispatcher'

export class SyncEngine {
  constructor(private provider: CommerceProvider, private organizationId: string) {}

  private async updateState(entity: string, status: string, stats?: any, error?: string) {
    const data: any = {
      status,
      lastAttempt: new Date(),
    }
    if (status === 'IDLE' && !error) {
      data.lastSuccessfulSync = new Date()
    }
    if (stats) {
      data.recordsProcessed = stats.processed
      data.recordsFailed = stats.failed
      data.duration = stats.duration
    }
    if (error !== undefined) {
      data.error = error
    }

    await db.syncState.upsert({
      where: { organizationId_provider_entity: { organizationId: this.organizationId, provider: this.provider.providerName, entity } },
      create: {
        organizationId: this.organizationId,
        provider: this.provider.providerName,
        entity,
        ...data
      },
      update: data,
    })
  }

  async runSync(entity: 'PRODUCT' | 'ORDER' | 'CUSTOMER', limit: number = 250) {
    const startTime = Date.now()
    let processed = 0
    let failed = 0
    
    await this.updateState(entity, 'RUNNING')

    try {
      let result;
      switch (entity) {
        case 'PRODUCT':
          result = await this.provider.syncProducts({ limit, organizationId: this.organizationId })
          for (const raw of result.items) {
            try {
              await CommerceHub.persistProduct(raw, this.organizationId, this.provider.providerName)
              processed++
            } catch (err: any) {
              console.error(`Failed to persist ${entity}`, err)
              failed++
            }
          }
          break;
        case 'ORDER':
          result = await this.provider.syncOrders({ limit, organizationId: this.organizationId })
          for (const raw of result.items) {
            try {
              await CommerceHub.persistOrder(raw, this.organizationId, this.provider.providerName)
              processed++
            } catch (err: any) {
              console.error(`Failed to persist ${entity}`, err)
              failed++
            }
          }
          break;
        case 'CUSTOMER':
          result = await this.provider.syncCustomers({ limit, organizationId: this.organizationId })
          for (const raw of result.items) {
            try {
              await CommerceHub.persistCustomer(raw, this.organizationId, this.provider.providerName)
              processed++
            } catch (err: any) {
              console.error(`Failed to persist ${entity}`, err)
              failed++
            }
          }
          break;
      }

      const duration = Date.now() - startTime
      await this.updateState(entity, 'IDLE', { processed, failed, duration }, null)
      
      await dispatchEvent(`${entity}S_SYNCED`, 'SYNC_ENGINE', {
        provider: this.provider.providerName,
        organizationId: this.organizationId,
        processed,
        failed,
        duration,
      })

      return { processed, failed, duration }

    } catch (error: any) {
      await this.updateState(entity, 'ERROR', undefined, error.message)
      await dispatchEvent('SYNC_FAILED', 'SYNC_ENGINE', {
        provider: this.provider.providerName,
        organizationId: this.organizationId,
        entity,
        error: error.message
      })
      throw error
    }
  }

  async runFullSync() {
    await dispatchEvent('SYNC_STARTED', 'SYNC_ENGINE', { provider: this.provider.providerName, organizationId: this.organizationId })
    
    const results = {
      products: await this.runSync('PRODUCT'),
      customers: await this.runSync('CUSTOMER'),
      orders: await this.runSync('ORDER'),
    }

    await dispatchEvent('SYNC_COMPLETED', 'SYNC_ENGINE', { provider: this.provider.providerName, organizationId: this.organizationId, results })
    
    return results
  }
}
