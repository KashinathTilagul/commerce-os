import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

// POST /api/brand-checks/run — generate a new brand scan
export async function POST() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const modules = ['PRODUCT', 'CONTENT', 'CAMPAIGN', 'PACKAGING', 'DIGITAL']
  const assets = [
    'Q4 Lookbook', 'Founder Note 09', 'Neel Blue Drop Campaign',
    'Premium Packaging V3', 'Mobile Site Hero V2', 'Wholesale Deck Q4',
    'Restoration Kit Visual', 'Luxe Drop 05', 'Origins Catalog Update',
  ]

  const module_ = modules[Math.floor(Math.random() * modules.length)]
  const asset = assets[Math.floor(Math.random() * assets.length)]
  const violations = Math.floor(Math.random() * 5)
  const status = violations === 0 ? 'PASS' : violations <= 2 ? 'WARN' : 'FAIL'

  const check = await db.brandCheck.create({
    data: {
      organizationId: auth.organizationId,
      module: module_,
      asset,
      status,
      violations,
      notes: violations === 0
        ? 'Within brand system.'
        : ['Palette drift detected.', 'Voice too loud.', 'Excessive gradient.', 'Meme aesthetic flagged.'][Math.floor(Math.random() * 4)],
    },
  })

  await db.event.create({
    data: {
      organizationId: auth.organizationId,
      type: 'BRAND_SCAN_COMPLETE',
      actorName: 'Brand Guardian AI',
      summary: `${asset}: ${status} (${violations} violations)`,
      payload: JSON.stringify({ checkId: check.id, status, violations }),
      severity: violations > 2 ? 'WARN' : 'INFO',
    },
  })

  return NextResponse.json(check)
}
