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
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}