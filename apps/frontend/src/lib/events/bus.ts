/**
 * Canonical Event Bus (EKVAAR OS v3.1)
 * 
 * Central nervous system of the operating system.
 * All modules, commerce integrations, AI agents, and kernel services emit typed events.
 * Handles event persistence, typed registry, and subscription dispatches.
 */

import { db } from '@/lib/db'

export type EventSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface CanonicalEventPayload {
  eventId: string
  organizationId: string
  source: string // e.g. SHOPIFY, INVENTORY_AGENT, MARKETING_AGENT, FINANCE_ENGINE
  eventType: string // e.g. STOCKOUT_WARNING, ROAS_DECLINE, ORDER_STUCK, SYNC_FAILED
  severity: EventSeverity
  confidence: number // 0 - 100
  businessObjectType: 'PRODUCT' | 'ORDER' | 'CUSTOMER' | 'CAMPAIGN' | 'WORKFLOW'
  businessObjectId: string
  title: string
  summary: string
  evidence: string
  recommendedAction: string
  impactAmount?: number
  metadata?: Record<string, any>
  timestamp: Date
}

type EventHandler = (event: CanonicalEventPayload) => Promise<void> | void

export class EventBus {
  private static subscribers: Map<string, EventHandler[]> = new Map()

  /**
   * Subscribe to a specific event type or '*' for all events
   */
  static subscribe(eventType: string, handler: EventHandler) {
    const list = this.subscribers.get(eventType) || []
    list.push(handler)
    this.subscribers.set(eventType, list)
  }

  /**
   * Publish a canonical event to the system bus & persist to database
   */
  static async publish(event: Omit<CanonicalEventPayload, 'eventId' | 'timestamp'> & { eventId?: string; timestamp?: Date }): Promise<CanonicalEventPayload> {
    const canonical: CanonicalEventPayload = {
      ...event,
      eventId: event.eventId || `evt_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: event.timestamp || new Date(),
    }

    console.log(`[EventBus] Emitted [${canonical.severity}] ${canonical.eventType} from ${canonical.source} (Org: ${canonical.organizationId})`)

    // 1. Database Persistence
    try {
      await db.systemEvent.create({
        data: {
          type: canonical.eventType,
          source: canonical.source,
          payload: JSON.stringify(canonical),
        },
      })
    } catch (err) {
      console.error('[EventBus] Failed to persist system event to DB:', err)
    }

    // 2. Dispatch to typed subscribers
    const handlers = [
      ...(this.subscribers.get(canonical.eventType) || []),
      ...(this.subscribers.get('*') || [])
    ]

    for (const handler of handlers) {
      try {
        await handler(canonical)
      } catch (err) {
        console.error(`[EventBus] Subscriber error for ${canonical.eventType}:`, err)
      }
    }

    return canonical
  }

  /**
   * Fetch recent event history for an organization
   */
  static async getHistory(organizationId: string, limit = 50): Promise<CanonicalEventPayload[]> {
    try {
      const records = await db.systemEvent.findMany({
        orderBy: { timestamp: 'desc' },
        take: limit,
      })

      const events: CanonicalEventPayload[] = []
      for (const rec of records) {
        try {
          const parsed = JSON.parse(rec.payload)
          if (parsed.organizationId === organizationId || parsed.organizationId === 'SYSTEM') {
            events.push(parsed)
          }
        } catch {
          // ignore unparseable legacy logs
        }
      }
      return events
    } catch (err) {
      console.error('[EventBus] Failed to fetch event history:', err)
      return []
    }
  }
}
