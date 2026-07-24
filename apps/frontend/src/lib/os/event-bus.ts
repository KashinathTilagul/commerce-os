/**
 * Real Event Bus (Phase 1.5)
 * 
 * Central nervous system for asynchronous module communication.
 * Publishes events to the database and notifies subscribers.
 */

import { OSModule } from './registry'
import { db } from '@/lib/db'

type EventPayload = { type: string; source: string; payload: any }
type EventHandler = (event: EventPayload) => Promise<void> | void

export interface IEventBus extends OSModule {
  publish(event: EventPayload): Promise<void>
  subscribe(eventType: string, handler: EventHandler): void
}

export class EventBus implements IEventBus {
  name = 'EventBus'
  private subscribers: Map<string, EventHandler[]> = new Map()

  async initialize() {
    console.log('[EventBus] Initializing Real Event Bus Pub/Sub...')
    // Setup core listeners
    this.subscribe('*', async (e) => {
      // Global audit logger
      console.log(`[EventBus] Global Audit: ${e.source} -> ${e.type}`)
    })
  }

  async health() {
    return { status: 'HEALTHY' as const, latencyMs: 1 }
  }

  async publish(event: EventPayload): Promise<void> {
    console.log(`[EventBus] Dispatching ${event.type} from ${event.source}`)
    
    // 1. Persist to ledger (for telemetry, observability, and Memory Engine)
    await db.systemEvent.create({
      data: {
        type: event.type,
        source: event.source,
        payload: JSON.stringify(event.payload || {})
      }
    })

    // 2. Notify exact subscribers
    const handlers = this.subscribers.get(event.type) || []
    for (const handler of handlers) {
      try {
        await handler(event)
      } catch (err) {
        console.error(`[EventBus] Subscriber error on ${event.type}:`, err)
      }
    }

    // 3. Notify wildcard subscribers
    const wildcardHandlers = this.subscribers.get('*') || []
    for (const handler of wildcardHandlers) {
      try {
        await handler(event)
      } catch (err) {
        console.error(`[EventBus] Wildcard subscriber error on ${event.type}:`, err)
      }
    }
  }

  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, [])
    }
    this.subscribers.get(eventType)!.push(handler)
    console.log(`[EventBus] New subscriber registered for ${eventType}`)
  }
}
