export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { EventBus } from '@/lib/events/bus'
import { EventTimelineEngine } from '@/lib/events/timeline'

export async function GET(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const history = await EventBus.getHistory(auth.organizationId, 50)
  return NextResponse.json({ events: history })
}

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const event = await EventBus.publish({
      ...body,
      organizationId: auth.organizationId,
    })

    await EventTimelineEngine.recordStage({
      organizationId: auth.organizationId,
      eventId: event.eventId,
      stage: 'RAISED',
      actor: event.source,
      summary: `Event ${event.eventType} emitted by ${event.source}`,
      details: event,
    })

    return NextResponse.json({ success: true, event })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
