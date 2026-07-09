import { NextRequest } from 'next/server'
import { createApiResponse, createApiError } from '@/lib/security'
import { requireAuth } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { PaginationSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.success) return authResult.response

  try {
    const { searchParams } = new URL(req.url)
    const tier = searchParams.get('tier')
    const paginationResult = PaginationSchema.safeParse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '50',
    })

    const page = paginationResult.success ? paginationResult.data.page : 1
    const limit = Math.min(paginationResult.success ? paginationResult.data.limit : 50, 100)

    const customers = await db.customer.findMany({
      where: tier && tier !== 'ALL' ? { tier } : undefined,
      orderBy: { totalSpent: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: false,
        city: true,
        tier: true,
        totalOrders: true,
        totalSpent: true,
        joinedAt: true,
        lastActive: true,
      },
    })

    const total = await db.customer.count({
      where: tier && tier !== 'ALL' ? { tier } : undefined,
    })

    return createApiResponse({
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[API] Customers error:', error)
    return createApiError('Failed to fetch customers', 500)
  }
}
