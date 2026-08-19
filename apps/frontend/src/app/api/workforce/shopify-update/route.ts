export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrganization } from '@/lib/auth-guard'
import { executeTool } from '@/lib/composio-service'

const schema = z.object({
  productId: z.string().optional(),
  handle: z.string().optional(),
  all: z.boolean().optional(),
  description: z.string().min(1),
  dryRun: z.boolean().optional(),
})

function getProducts(output: any): any[] {
  if (Array.isArray(output?.products)) return output.products
  if (Array.isArray(output?.data?.products)) return output.data.products
  if (Array.isArray(output)) return output
  return []
}

// Shopify product description update — single product (by id or handle) or
// every product. Reuses the composio shopify_update_product tool verbatim.
export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid request' }, { status: 400 })
  const { productId, handle, all, description, dryRun = false } = parsed.data

  const run = (organizationId: string, toolSlug: string, input: Record<string, any>) =>
    executeTool({ organizationId, toolkitSlug: 'shopify', toolSlug, agentCode: 'CMO', agentName: 'Workforce', input })

  try {
    let targets: Array<{ id: string; title?: string }> = []
    if (all) {
      const list = await run(auth.organizationId, 'shopify_get_products', { limit: 250 })
      if (!list.success) throw new Error(list.error || 'Failed to list products')
      targets = getProducts(list.output).map((p: any) => ({ id: String(p.id), title: p.title }))
      if (targets.length === 0) throw new Error('No products found in the connected store')
    } else {
      let id = productId
      if (!id && handle) {
        const list = await run(auth.organizationId, 'shopify_get_products', { limit: 250 })
        if (!list.success) throw new Error(list.error || 'Failed to list products')
        const match = getProducts(list.output).find((p: any) => p.handle === handle || String(p.id) === handle)
        if (!match) throw new Error(`No product with handle "${handle}"`)
        id = String(match.id)
      }
      if (!id) return NextResponse.json({ error: 'Provide productId, handle, or all:true' }, { status: 400 })
      targets = [{ id }]
    }

    if (dryRun) return NextResponse.json({ status: 'DRY_RUN', matched: targets.length, targets })

    const results: Array<{ productId: string; title?: string; success: boolean; error?: string }> = []
    for (const target of targets) {
      const update = await run(auth.organizationId, 'shopify_update_product', { product_id: target.id, body_html: description })
      results.push({ productId: target.id, title: target.title, success: update.success, error: update.error })
    }
    const failed = results.filter((r) => !r.success)
    return NextResponse.json({ status: failed.length === 0 ? 'UPDATED' : failed.length === results.length ? 'FAILED' : 'PARTIALLY_UPDATED', updated: results.length - failed.length, failed: failed.length, results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Shopify update failed' }, { status: 502 })
  }
}
