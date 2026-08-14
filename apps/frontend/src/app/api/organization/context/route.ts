export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { createApiResponse, createApiError } from '@/lib/security'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const EDITABLE_FIELDS = ['companyProfile', 'brandDna', 'industry', 'products', 'toneOfVoice', 'policies', 'goals'] as const

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return createApiError('Unauthorized', 401)
    }

    const context = await db.organizationContext.findUnique({
      where: { organizationId: session.user.organizationId }
    })

    // No context yet is normal for a fresh org — return empty defaults
    // instead of 404 so the edit form always has something to render.
    return createApiResponse(context || {
      companyProfile: '', brandDna: '', industry: '', products: '', toneOfVoice: '', policies: '', goals: '',
    })
  } catch (e: any) {
    console.error('Failed to fetch org context:', e)
    return createApiError('Internal Server Error', 500)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return createApiError('Unauthorized', 401)
    }
    const organizationId = session.user.organizationId

    const raw = await req.json()
    const data = Object.fromEntries(
      Object.entries(raw).filter(([k]) => (EDITABLE_FIELDS as readonly string[]).includes(k))
    )
    if (Object.keys(data).length === 0) {
      return createApiError('No valid fields', 400)
    }

    const context = await db.organizationContext.upsert({
      where: { organizationId },
      update: data,
      create: { organizationId, ...data },
    })

    return createApiResponse(context)
  } catch (e: any) {
    console.error('Failed to update org context:', e)
    return createApiError('Internal Server Error', 500)
  }
}
