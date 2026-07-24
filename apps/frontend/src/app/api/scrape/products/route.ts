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
    const competitorId = searchParams.get('competitorId')
    const ourSku = searchParams.get('ourSku')
    const inStock = searchParams.get('inStock')
    const hasAlerts = searchParams.get('hasAlerts')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = { userId: session.user.id }

    if (competitorId) where.competitorId = competitorId
    if (ourSku) where.ourSku = ourSku
    if (inStock !== null) where.inStock = inStock === 'true'

    if (hasAlerts === 'true') {
      where.alerts = { some: { acknowledged: false } }
    }

    const [products, total] = await Promise.all([
      db.competitorProduct.findMany({
        where,
        include: {
          competitor: { select: { id: true, name: true, domain: true, color: true } },
          priceHistory: {
            orderBy: { scrapedAt: 'desc' },
            take: 5,
          },
          alerts: {
            where: { acknowledged: false },
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
        orderBy: { lastScrapedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.competitorProduct.count({ where }),
    ])

    return NextResponse.json({ products, total })
  } catch (error: any) {
    console.error('Products fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      competitorId,
      url,
      name,
      price,
      mrp,
      discount,
      ourSku,
      ourProductId,
      imageUrl,
      brand,
      category,
      inStock,
      sizes,
      colors,
      rating,
      reviewCount,
      competitorSku,
    } = body

    if (!competitorId || !url || !name) {
      return NextResponse.json({ error: 'competitorId, url, and name are required' }, { status: 400 })
    }

    const competitor = await db.competitor.findFirst({
      where: { id: competitorId, userId: session.user.id },
    })

    if (!competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })
    }

    const existing = await db.competitorProduct.findFirst({
      where: { userId: session.user.id, url },
    })

    if (existing) {
      const updated = await db.competitorProduct.update({
        where: { id: existing.id },
        data: {
          name,
          price,
          mrp,
          discount,
          ourSku,
          ourProductId,
          imageUrl,
          brand,
          category,
          inStock,
          sizes: sizes?.join(',') || '',
          colors: colors?.join(',') || '',
          rating,
          reviewCount,
          competitorSku,
          lastScrapedAt: new Date(),
          scrapeStatus: 'success',
          updatedAt: new Date(),
        },
      })

      await db.priceHistory.create({
        data: {
          productId: updated.id,
          price,
          mrp,
          discount,
          inStock,
        },
      })

      return NextResponse.json({ product: updated, created: false })
    }

    const product = await db.competitorProduct.create({
      data: {
        userId: session.user.id,
        competitorId,
        url,
        name,
        price,
        mrp,
        discount,
        ourSku,
        ourProductId,
        imageUrl,
        brand,
        category,
        inStock,
        sizes: sizes?.join(',') || '',
        colors: colors?.join(',') || '',
        rating,
        reviewCount,
        competitorSku,
        lastScrapedAt: new Date(),
        scrapeStatus: 'success',
      },
    })

    await db.priceHistory.create({
      data: {
        productId: product.id,
        price,
        mrp,
        discount,
        inStock,
      },
    })

    return NextResponse.json({ product, created: true }, { status: 201 })
  } catch (error: any) {
    console.error('Product create error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
