export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const { baseUrl, apiKey, imageModel } = body

    if (!baseUrl) {
      return NextResponse.json({ error: 'baseUrl is required' }, { status: 400 })
    }

    const updateData: Record<string, string> = {
      primaryBaseUrl: baseUrl,
      primaryApiKey: apiKey || '',
    }
    if (imageModel !== undefined) {
      updateData.omnirouteImageModel = imageModel
    }

    await db.systemSetting.upsert({
      where: { id: 'global' },
      update: updateData,
      create: {
        id: 'global',
        ...updateData,
      } as any,
    })

    return NextResponse.json({ success: true, baseUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}