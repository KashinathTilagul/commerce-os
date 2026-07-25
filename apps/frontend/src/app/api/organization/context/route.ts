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

    const context = await db.organizationContext.findUnique({
      where: { organizationId: session.user.organizationId }
    })

    if (!context) {
      return createApiError('Context not found', 404)
    }

    return createApiResponse(context)
  } catch (e: any) {
    console.error('Failed to fetch org context:', e)
    return createApiError('Internal Server Error', 500)
  }
}
