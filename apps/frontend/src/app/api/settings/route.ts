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
  const body = await req.json()
  
  // ensure we don't accidentally update 'id' or 'updatedAt' from the body
  delete body.id
  delete body.updatedAt

  const updated = await db.systemSetting.upsert({
    where: { id: 'global' },
    update: body,
    create: { id: 'global', ...body },
  })
  
  // Log event
  await db.event.create({
    data: {
      type: 'SYSTEM_SETTINGS_UPDATED',
      actorName: 'Founder',
      summary: `Updated system settings`,
      payload: JSON.stringify(Object.keys(body)),
      severity: 'INFO',
    },
  })

  return NextResponse.json(updated)
}
