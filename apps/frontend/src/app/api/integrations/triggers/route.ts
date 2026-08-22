export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrganization } from '@/lib/auth-guard'
import {
  createComposioTrigger,
  getComposioTriggerType,
  listComposioTriggers,
} from '@/lib/composio-service'

const CreateTriggerSchema = z.object({
  slug: z.string().trim().min(1).max(160).regex(/^[A-Z0-9_]+$/),
  connectedAccountId: z.string().trim().min(1).max(200).optional(),
  triggerConfig: z.record(z.string(), z.unknown()).default({}),
})

export async function GET(request: Request) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  try {
    const slug = new URL(request.url).searchParams.get('slug')?.trim()
    if (slug) {
      const triggerType = await getComposioTriggerType(auth.organizationId, slug)
      return NextResponse.json({ triggerType })
    }
    const triggers = await listComposioTriggers(auth.organizationId)
    return NextResponse.json(triggers)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load triggers' }, { status: 400 })
  }
}

export async function POST(request: Request) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response
  try {
    const input = CreateTriggerSchema.parse(await request.json())
    const result = await createComposioTrigger({ organizationId: auth.organizationId, ...input })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid trigger configuration', issues: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create trigger' }, { status: 400 })
  }
}
