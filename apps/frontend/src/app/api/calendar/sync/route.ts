import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'
import { executeTool } from '@/lib/composio-service'

export async function POST() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const googleCalendarIntegration = await db.integration.findFirst({
    where: {
      organizationId: auth.organizationId,
      toolkitSlug: 'google_calendar',
      isConnected: true,
    },
  })

  if (!googleCalendarIntegration) {
    return NextResponse.json({
      error: 'Google Calendar not connected. Connect it in Integrations first.',
      synced: false,
    })
  }

  let pulled = 0
  let pushed = 0
  let errors: string[] = []

  try {
    const now = new Date()
    const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()

    const pullResult = await executeTool({
      organizationId: auth.organizationId,
      toolkitSlug: 'google_calendar',
      toolSlug: 'google_calendar_list_events',
      agentCode: 'FOUNDER',
      agentName: 'Founder',
      input: { timeMin, timeMax, maxResults: 100 },
    })

    if (pullResult.success && pullResult.output?.items) {
      for (const gEvent of pullResult.output.items) {
        if (!gEvent.id || !gEvent.summary) continue

        const existing = await db.calendarEvent.findFirst({
          where: { organizationId: auth.organizationId, googleEventId: gEvent.id },
        })

        if (!existing) {
          await db.calendarEvent.create({
            data: {
              organizationId: auth.organizationId,
              title: gEvent.summary,
              description: gEvent.description || '',
              start: new Date(gEvent.start?.dateTime || gEvent.start?.date || now),
              end: new Date(gEvent.end?.dateTime || gEvent.end?.date || now),
              color: '#34C759',
              googleEventId: gEvent.id,
              source: 'google',
            },
          })
          pulled++
        }
      }
    }
  } catch (e: any) {
    errors.push(`Pull failed: ${e.message}`)
  }

  try {
    const localEvents = await db.calendarEvent.findMany({
      where: { organizationId: auth.organizationId, source: 'local', googleEventId: null },
    })

    for (const event of localEvents) {
      const pushResult = await executeTool({
        organizationId: auth.organizationId,
        toolkitSlug: 'google_calendar',
        toolSlug: 'google_calendar_create_event',
        agentCode: 'FOUNDER',
        agentName: 'Founder',
        input: {
          summary: event.title,
          description: event.description || '',
          start: { dateTime: event.start.toISOString() },
          end: { dateTime: event.end.toISOString() },
        },
      })

      if (pushResult.success && pushResult.output?.id) {
        await db.calendarEvent.update({
          where: { id: event.id },
          data: { googleEventId: pushResult.output.id },
        })
        pushed++
      }
    }
  } catch (e: any) {
    errors.push(`Push failed: ${e.message}`)
  }

  return NextResponse.json({
    synced: true,
    pulled,
    pushed,
    errors: errors.length > 0 ? errors : undefined,
    lastSynced: new Date().toISOString(),
  })
}
