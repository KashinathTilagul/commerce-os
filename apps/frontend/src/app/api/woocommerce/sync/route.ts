export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { WooCommerceProvider } from '@/lib/commerce/woocommerce-provider'
import { SyncEngine } from '@/lib/commerce/sync-engine'

export async function POST() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  const user = await db.user.findUnique({ where: { id: auth.user.id }, select: { orgRole: true } })
  if (!user || !['Founder', 'Admin'].includes(user.orgRole)) return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })

  const orgId = auth.organizationId

  try {
    const provider = new WooCommerceProvider()
    const engine = new SyncEngine(provider, orgId)

    const results = await engine.runFullSync()

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Commerce Hub Sync Error:', error)
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 })
  }
}
