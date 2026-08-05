import { db } from '@/lib/db'

export type EventSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface CanonicalEventPayload {
  eventId: string
  organizationId: string
  source: string
  eventType: string
  severity: EventSeverity
  confidence: number
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

// ponytail: pub/sub event system — subscribers stored in-memory, single-container assumption.
// For multi-instance, offload to message broker (Redis Pub/Sub, Kafka, or SQS).
export class EventBus {
  private static subscribers: Map<string, EventHandler[]> = new Map()

  static subscribe(eventType: string, handler: EventHandler) {
    const list = this.subscribers.get(eventType) || []
    list.push(handler)
    this.subscribers.set(eventType, list)
  }

  static async publish(event: Omit<CanonicalEventPayload, 'eventId' | 'timestamp'> & { eventId?: string; timestamp?: Date }): Promise<CanonicalEventPayload> {
    const canonical: CanonicalEventPayload = {
      ...event,
      eventId: event.eventId || `evt_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: event.timestamp || new Date(),
    }

    console.log(`[EventBus] Emitted [${canonical.severity}] ${canonical.eventType} from ${canonical.source}`)

    try {
      await db.systemEvent.create({
        data: {
          type: canonical.eventType,
          source: canonical.source,
          payload: JSON.stringify(canonical),
        },
      })
    } catch (err) {
      console.error('[EventBus] Failed to persist system event:', err)
    }

    const handlers = [
      ...(this.subscribers.get(canonical.eventType) || []),
      ...(this.subscribers.get('*') || []),
    ]

    for (const handler of handlers) {
      try {
        await handler(canonical)
      } catch (err) {
        console.error(`[EventBus] Subscriber error:`, err)
      }
    }

    return canonical
  }

  static async getHistory(organizationId: string, limit: number = 50): Promise<CanonicalEventPayload[]> {
    const events = await db.systemEvent.findMany({
      where: { payload: { contains: organizationId } },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    return events.map(e => {
      try {
        return JSON.parse(e.payload as string) as CanonicalEventPayload
      } catch {
        return null
      }
    }).filter(Boolean) as CanonicalEventPayload[]
  }
}
