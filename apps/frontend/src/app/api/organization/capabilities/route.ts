export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { createApiResponse, createApiError } from '@/lib/security'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return createApiError('Unauthorized', 401)
    }

    const capabilities = await db.capability.findMany({
      where: { organizationId: session.user.organizationId },
      select: { id: true, name: true, category: true, description: true }
    })

    return createApiResponse(capabilities)
  } catch (e: any) {
    console.error('Failed to fetch capabilities:', e)
    return createApiError('Internal Server Error', 500)
  }
}
