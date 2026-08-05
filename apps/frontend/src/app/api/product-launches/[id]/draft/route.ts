export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { queueQikinkDraft } from '@/lib/product-launches'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const launch = await queueQikinkDraft(id, auth.organizationId)
    return NextResponse.json(launch)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Could not queue Qikink draft' }, { status: 400 })
  }
}
