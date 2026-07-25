/**
 * Event Timeline & Audit Trail Engine (EKVAAR OS v3.1)
 * 
 * Records the complete operational history of every business decision:
 * Event Raised -> Intelligence Evaluated -> Action Recommended -> Founder Decision -> Execution Completed.
 */

import { db } from '@/lib/db'

export interface TimelineEntry {
  id: string
  organizationId: string
  eventId: string
  stage: 'RAISED' | 'EVALUATED' | 'RECOMMENDED' | 'DECIDED' | 'EXECUTED'
  actor: string // e.g. "Inventory Agent", "Krishna Chief of Staff", "Founder (Kashinath)"
  summary: string
  details?: Record<string, any>
  timestamp: Date
}

export class EventTimelineEngine {
  /**
   * Record a new stage in the event lifecycle
   */
  static async recordStage(entry: Omit<TimelineEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: Date }): Promise<TimelineEntry> {
    const fullEntry: TimelineEntry = {
      ...entry,
      id: entry.id || `tl_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: entry.timestamp || new Date(),
    }

    try {
      await db.event.create({
        data: {
          organizationId: fullEntry.organizationId,
          type: `TIMELINE_${fullEntry.stage}`,
          actorName: fullEntry.actor,
          summary: fullEntry.summary,
          payload: JSON.stringify(fullEntry),
          severity: fullEntry.stage === 'DECIDED' ? 'IMPORTANT' : 'INFO',
        },
      })
    } catch (err) {
      console.error('[EventTimelineEngine] Failed to record timeline stage:', err)
    }

    return fullEntry
  }

  /**
   * Fetch full timeline trail for a specific event
   */
  static async getEventTimeline(organizationId: string, eventId: string): Promise<TimelineEntry[]> {
    try {
      const records = await db.event.findMany({
        where: { organizationId },
        orderBy: { timestamp: 'asc' },
        take: 100,
      })

      const timeline: TimelineEntry[] = []
      for (const r of records) {
        try {
          const parsed = JSON.parse(r.payload)
          if (parsed.eventId === eventId) {
            timeline.push(parsed)
          }
        } catch {
          // ignore
        }
      }
      return timeline
    } catch (err) {
      console.error('[EventTimelineEngine] Failed to get event timeline:', err)
      return []
    }
  }
}
