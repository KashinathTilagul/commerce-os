export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function POST() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    await db.systemSetting.update({
      where: { id: 'global' },
      data: {
        primaryApiKey: '',
        primaryBaseUrl: '',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}