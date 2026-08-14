export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'
import { seedIntegrations } from '@/lib/composio-service'

const OnboardingSchema = z.object({
  organizationName: z.string().trim().min(2).max(100).optional(),
  companyProfile: z.string().trim().max(1200).optional(),
  industry: z.string().trim().max(120).optional(),
  products: z.string().trim().max(1200).optional(),
  toneOfVoice: z.string().trim().max(500).optional(),
  goals: z.string().trim().max(1200).optional(),
  onboardingStep: z.number().int().min(0).max(3).optional(),
  complete: z.boolean().optional(),
})

export async function GET() {
  try {
    const auth = await requireOrganization()
    if (!auth.success) return auth.response

    await seedIntegrations(auth.organizationId)
    const organization = await db.organization.findUnique({
      where: { id: auth.organizationId },
      include: { context: true },
    })
    if (!organization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const integrations = await db.integration.findMany({
      where: { organizationId: auth.organizationId },
      select: { id: true, toolkitSlug: true, name: true, description: true, category: true, logoUrl: true, isConnected: true },
      orderBy: [{ isConnected: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({
      organization: {
        name: organization.name,
        slug: organization.slug,
        onboardingStep: organization.onboardingStep,
        onboardingCompletedAt: organization.onboardingCompletedAt,
      },
      context: organization.context,
      integrations,
    })
  } catch (error: any) {
    console.error('Onboarding GET Error:', error)
    const isConnRefused = error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')
    const message = isConnRefused
      ? 'Database connection failed: Could not connect to PostgreSQL server on localhost:5432. Ensure PostgreSQL is running and DATABASE_URL is correct.'
      : (error?.message || 'Could not load setup')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const parsed = OnboardingSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid setup details' }, { status: 400 })
  }

  const { organizationName, onboardingStep, complete, ...contextData } = parsed.data
  if (complete) {
    const organization = await db.organization.findUnique({
      where: { id: auth.organizationId },
      include: { context: true },
    })
    if (!organization?.context?.industry || !organization.context.companyProfile) {
      return NextResponse.json({ error: 'Complete your business profile before finishing setup' }, { status: 400 })
    }
  }

  await db.$transaction([
    db.organization.update({
      where: { id: auth.organizationId },
      data: {
        ...(organizationName ? { name: organizationName } : {}),
        ...(onboardingStep !== undefined ? { onboardingStep } : {}),
        ...(complete ? { onboardingStep: 3, onboardingCompletedAt: new Date() } : {}),
      },
    }),
    db.organizationContext.upsert({
      where: { organizationId: auth.organizationId },
      update: contextData,
      create: { organizationId: auth.organizationId, ...contextData },
    }),
  ])

  if (complete) {
    const { seedDatabase } = await import('@/lib/seed')
    await seedDatabase(auth.organizationId)
  }

  return NextResponse.json({ success: true, completed: Boolean(complete) })
}
