export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'

// Raw media and captions are not an approved draft. Use task publishing.
export async function POST() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  return NextResponse.json({ error: 'Direct publishing disabled. Approve a marketing task, then use /api/marketing/automation/[id]/publish.' }, { status: 403 })
}
