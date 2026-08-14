export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireOrganization, requireAuth } from '@/lib/auth-guard'
import { ShopifyProvider } from '@/lib/commerce/shopify-provider'
import { SyncEngine } from '@/lib/commerce/sync-engine'

export async function POST() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const orgId = auth.organizationId

  try {
    const provider = new ShopifyProvider()
    const engine = new SyncEngine(provider, orgId)

    const results = await engine.runFullSync()

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Commerce Hub Sync Error:', error)
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 })
  }
}
