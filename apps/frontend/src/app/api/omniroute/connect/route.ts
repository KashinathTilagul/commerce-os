export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const { baseUrl, apiKey } = body

    if (!baseUrl) {
      return NextResponse.json({ error: 'baseUrl is required' }, { status: 400 })
    }

    // Store OmniRoute configuration
    await db.systemSetting.upsert({
      where: { id: 'global' },
      update: {
        primaryBaseUrl: baseUrl,
        primaryApiKey: apiKey || '',
      },
      create: {
        id: 'global',
        primaryBaseUrl: baseUrl,
        primaryApiKey: apiKey || '',
      },
    })

    return NextResponse.json({ success: true, baseUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}