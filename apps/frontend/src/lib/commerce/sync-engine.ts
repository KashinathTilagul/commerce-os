import { CommerceProvider } from './provider'
import { CommerceHub } from './hub'
import { db } from '@/lib/db'

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
      await this.updateState(entity, 'IDLE', { processed, failed, duration }, undefined)
      
      await db.event.create({
        data: {
          organizationId: this.organizationId,
          type: `${entity}S_SYNCED`,
          actorName: 'SYNC_ENGINE',
          summary: `${entity} sync completed for ${this.provider.providerName}`,
          payload: JSON.stringify({ provider: this.provider.providerName, processed, failed, duration }),
          severity: 'INFO',
        },
      })

      return { processed, failed, duration }

    } catch (error: any) {
      await this.updateState(entity, 'ERROR', undefined, error.message)
      await db.event.create({
        data: {
          organizationId: this.organizationId,
          type: 'SYNC_FAILED',
          actorName: 'SYNC_ENGINE',
          summary: `${entity} sync failed for ${this.provider.providerName}: ${error.message}`,
          payload: JSON.stringify({ provider: this.provider.providerName, entity, error: error.message }),
          severity: 'ERROR',
        },
      })
      throw error
    }
  }

  async runFullSync() {
    await db.event.create({
      data: {
        organizationId: this.organizationId,
        type: 'SYNC_STARTED',
        actorName: 'SYNC_ENGINE',
        summary: `Sync started for ${this.provider.providerName}`,
        payload: JSON.stringify({ provider: this.provider.providerName }),
        severity: 'INFO',
      },
    })
    
    const results = {
      products: await this.runSync('PRODUCT'),
      customers: await this.runSync('CUSTOMER'),
      orders: await this.runSync('ORDER'),
    }

    await db.event.create({
      data: {
        organizationId: this.organizationId,
        type: 'SYNC_COMPLETED',
        actorName: 'SYNC_ENGINE',
        summary: `Sync completed for ${this.provider.providerName}`,
        payload: JSON.stringify({ provider: this.provider.providerName, results }),
        severity: 'INFO',
      },
    })
    
    return results
  }
}
