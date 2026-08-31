import { NextResponse } from 'next/server'

import { requireOrganization } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const url = process.env.RAKAZO_PUBLIC_URL?.trim() || ''

  return NextResponse.json({
    url,
    configured: Boolean(url),
  })
}
