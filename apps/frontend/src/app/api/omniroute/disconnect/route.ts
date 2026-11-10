export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireOrgAdmin } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function POST() {
  const auth = await requireOrgAdmin()
  if (!auth.success) return auth.response

  try {
    await db.systemSetting.upsert({
      where: { organizationId: auth.organizationId },
      update: {
        primaryApiKey: '',
      },
      create: {
        organizationId: auth.organizationId,
        primaryApiKey: '',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
