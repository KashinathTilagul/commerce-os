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
    const productId = searchParams.get('productId')
    const competitorId = searchParams.get('competitorId')
    const days = parseInt(searchParams.get('days') || '30')
    const limit = parseInt(searchParams.get('limit') || '1000')

    if (!productId && !competitorId) {
      return NextResponse.json({ error: 'productId or competitorId required' }, { status: 400 })
    }

    const since = new Date()
    since.setDate(since.getDate() - days)

    if (productId) {
      const product = await db.competitorProduct.findFirst({
        where: { id: productId, userId: session.user.id },
      })

      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }

      const history = await db.priceHistory.findMany({
        where: { productId, scrapedAt: { gte: since } },
        orderBy: { scrapedAt: 'asc' },
        take: limit,
      })

      const stats = {
        minPrice: Math.min(...history.map(h => h.price)),
        maxPrice: Math.max(...history.map(h => h.price)),
        avgPrice: history.reduce((sum, h) => sum + h.price, 0) / history.length || 0,
        priceChange: history.length > 1 ? history[history.length - 1].price - history[0].price : 0,
        priceChangePercent:
          history.length > 1
            ? ((history[history.length - 1].price - history[0].price) / history[0].price) * 100
            : 0,
      }

      return NextResponse.json({ history, stats, product })
    }

    if (competitorId) {
      const competitor = await db.competitor.findFirst({
        where: { id: competitorId, userId: session.user.id },
      })

      if (!competitor) {
        return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })
      }

      const products = await db.competitorProduct.findMany({
        where: { competitorId },
        include: {
          priceHistory: {
            where: { scrapedAt: { gte: since } },
            orderBy: { scrapedAt: 'asc' },
            take: limit,
          },
        },
      })

      return NextResponse.json({ competitor, products })
    }
  } catch (error: any) {
    console.error('History fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
