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
    const acknowledged = searchParams.get('acknowledged')
    const productId = searchParams.get('productId')
    const alertType = searchParams.get('alertType')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = { product: { userId: session.user.id } }

    if (acknowledged !== null) where.acknowledged = acknowledged === 'true'
    if (productId) where.productId = productId
    if (alertType) where.alertType = alertType

    const alerts = await db.priceAlert.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            url: true,
            imageUrl: true,
            ourSku: true,
            competitor: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const unackedCount = await db.priceAlert.count({
      where: { product: { userId: session.user.id }, acknowledged: false },
    })

    return NextResponse.json({ alerts, unackedCount })
  } catch (error: any) {
    console.error('Alerts fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, acknowledged } = body

    if (!id) {
      return NextResponse.json({ error: 'Alert ID required' }, { status: 400 })
    }

    const alert = await db.priceAlert.findFirst({
      where: { id },
      include: { product: true },
    })

    if (!alert || alert.product.userId !== session.user.id) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    const updated = await db.priceAlert.update({
      where: { id },
      data: {
        acknowledged: acknowledged ?? true,
        acknowledgedAt: acknowledged ? new Date() : null,
      },
    })

    return NextResponse.json({ alert: updated })
  } catch (error: any) {
    console.error('Alert update error:', error)
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, alertType, oldPrice, newPrice, changePercent, threshold } = body

    if (!productId || !alertType) {
      return NextResponse.json({ error: 'productId and alertType required' }, { status: 400 })
    }

    const product = await db.competitorProduct.findFirst({
      where: { id: productId, userId: session.user.id },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const alert = await db.priceAlert.create({
      data: {
        productId,
        alertType,
        threshold: threshold || 5,
        oldPrice,
        newPrice,
        changePercent,
        changeAbsolute: oldPrice && newPrice ? Math.abs(newPrice - oldPrice) : null,
      },
    })

    return NextResponse.json({ alert }, { status: 201 })
  } catch (error: any) {
    console.error('Alert create error:', error)
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
  }
}
