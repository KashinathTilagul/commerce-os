import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  let settings = await db.systemSetting.findUnique({ where: { id: 'global' } })
  
  if (!settings) {
    settings = await db.systemSetting.create({
      data: { id: 'global' },
    })
  }
  
  return NextResponse.json(settings)
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    delete body.id
    delete body.updatedAt

    const updated = await db.systemSetting.upsert({
      where: { id: 'global' },
      update: body,
      create: { id: 'global', ...body },
    })

    // Non-blocking — don't fail the save if event logging breaks
    db.event.create({
      data: {
        type: 'SYSTEM_SETTINGS_UPDATED',
        actorName: 'Founder',
        summary: 'Updated system settings',
        payload: JSON.stringify(Object.keys(body)),
        severity: 'INFO',
      },
    }).catch(() => {})

    return NextResponse.json(updated)
  } catch (e: any) {
    console.error('[Settings PATCH]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
