export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const settings = await db.systemSetting.findUnique({ where: { id: 'global' } })
    
    return NextResponse.json({
      baseUrl: settings?.primaryBaseUrl || process.env.OMNIROUTE_BASE_URL || 'http://omniroute:20128/v1',
      hasApiKey: Boolean(settings?.primaryApiKey),
      imageModel: settings?.omnirouteImageModel || 'google/gemini-2.0-flash-exp:image',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const { baseUrl, apiKey, imageModel } = body

    const updateData: Record<string, string> = {}
    if (baseUrl !== undefined) updateData.primaryBaseUrl = baseUrl
    if (apiKey !== undefined) updateData.primaryApiKey = apiKey
    if (imageModel !== undefined) updateData.omnirouteImageModel = imageModel

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    await db.systemSetting.upsert({
      where: { id: 'global' },
      update: updateData,
      create: {
        id: 'global',
        ...updateData,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}