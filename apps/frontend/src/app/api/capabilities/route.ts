import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'
import { queryCapabilities, registerCapabilities } from '@/lib/capability-registry'

export async function GET(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') || undefined
  const search = searchParams.get('search') || undefined
  const availability = searchParams.get('availability') || undefined

  const result = await queryCapabilities(auth.organizationId, { category, search, availability })
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const body = await req.json()
  if (!body.ownerId || !body.capabilities || !Array.isArray(body.capabilities)) {
    return NextResponse.json({ error: 'Missing ownerId or capabilities array' }, { status: 400 })
  }

  const result = await registerCapabilities(auth.organizationId, body.ownerId, body.capabilities)
  return NextResponse.json({ success: true, capabilities: result })
}
