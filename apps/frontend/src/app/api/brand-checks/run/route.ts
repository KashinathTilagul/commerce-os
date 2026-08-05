export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'

// POST /api/brand-checks/run — generate a new brand scan
export async function POST() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  return NextResponse.json(
    { error: 'Connect a brand scanner before running a scan. No synthetic result was created.' },
    { status: 501 },
  )
}
