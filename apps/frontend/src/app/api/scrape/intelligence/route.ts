import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''

    const [alertsCount, totalProducts, totalCompetitors, recentAlerts, priceChangesToday, topPriceDrops, topPriceIncreases, competitorStats] = await Promise.all([
      db.priceAlert.count({
        where: { product: { userId: session.user.id }, acknowledged: false },
      }),

      db.competitorProduct.count({
        where: { userId: session.user.id },
      }),

      db.competitor.count({
        where: { userId: session.user.id, active: true },
      }),

      db.priceAlert.findMany({
        where: { product: { userId: session.user.id }, acknowledged: false },
        include: { product: { include: { competitor: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      db.priceAlert.count({
        where: {
          product: { userId: session.user.id },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),

      db.priceAlert.findMany({
        where: {
          product: { userId: session.user.id },
          alertType: 'price_drop',
          acknowledged: false,
        },
        include: { product: { include: { competitor: true } } },
        orderBy: { changePercent: 'asc' },
        take: 5,
      }),

      db.priceAlert.findMany({
        where: {
          product: { userId: session.user.id },
          alertType: 'price_increase',
          acknowledged: false,
        },
        include: { product: { include: { competitor: true } } },
        orderBy: { changePercent: 'desc' },
        take: 5,
      }),

      db.competitor.findMany({
        where: { userId: session.user.id },
        include: {
          _count: { select: { products: true } },
          products: {
            select: { price: true, inStock: true },
          },
        },
      }),
    ])

    const competitorInsights = competitorStats.map(c => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      color: c.color,
      productsCount: c._count.products,
      avgPrice: c.products.length > 0
        ? c.products.reduce((sum, p) => sum + p.price, 0) / c.products.length
        : 0,
      inStockRate: c.products.length > 0
        ? (c.products.filter(p => p.inStock).length / c.products.length) * 100
        : 0,
    }))

    const avgDiscount = await db.competitorProduct.aggregate({
      where: { userId: session.user.id },
      _avg: { discount: true },
    })

    let searchResults: any[] = []
    if (query) {
      searchResults = await db.competitorProduct.findMany({
        where: {
          userId: session.user.id,
          OR: [
            { name: { contains: query } },
            { brand: { contains: query } },
            { ourSku: { contains: query } },
          ],
        },
        include: { competitor: true, priceHistory: { orderBy: { scrapedAt: 'desc' }, take: 5 } },
        take: 20,
      })
    }

    return NextResponse.json({
      summary: {
        alertsCount,
        totalProducts,
        totalCompetitors,
        priceChangesToday,
        avgDiscount: avgDiscount._avg.discount || 0,
      },
      recentAlerts,
      topPriceDrops,
      topPriceIncreases,
      competitorInsights,
      searchResults,
    })
  } catch (error: any) {
    console.error('Intelligence fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch intelligence' }, { status: 500 })
  }
}
