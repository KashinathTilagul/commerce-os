export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'
import { nextLaunchCode } from '@/lib/product-launch-code'

const CreateLaunchSchema = z.object({
  title: z.string().trim().min(3).max(160),
  productType: z.string().trim().min(2).max(80),
  templateKey: z.string().trim().min(2).max(80).default('apparel-standard'),
  designArtifactId: z.string().trim().min(1).max(128).optional(),
  designBrief: z.string().trim().max(4000).optional(),
  skuPlan: z.record(z.string(), z.unknown()).optional(),
})

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const launches = await db.productLaunch.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(launches)
}

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const parsed = CreateLaunchSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid launch' }, { status: 400 })

  const existing = await db.productLaunch.findMany({
    where: { organizationId: auth.organizationId },
    select: { code: true },
  })
  const launch = await db.productLaunch.create({
    data: {
      organizationId: auth.organizationId,
      code: nextLaunchCode(existing.map((item) => item.code)),
      title: parsed.data.title,
      productType: parsed.data.productType,
      templateKey: parsed.data.templateKey,
      designArtifactId: parsed.data.designArtifactId,
      designBrief: parsed.data.designBrief,
      skuPlan: parsed.data.skuPlan ? JSON.stringify(parsed.data.skuPlan) : null,
      status: parsed.data.designArtifactId ? 'SKU_PLANNED' : 'DESIGN_REVIEW',
    },
  })

  return NextResponse.json(launch, { status: 201 })
}
