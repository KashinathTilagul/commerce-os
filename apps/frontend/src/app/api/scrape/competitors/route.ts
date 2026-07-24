import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { COMPETITOR_CONFIGS } from '@/lib/crawlers'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')

    const where: any = { userId: session.user.id }
    if (active !== null) {
      where.active = active === 'true'
    }

    const competitors = await db.competitor.findMany({
      where,
      include: {
        _count: { select: { products: true } },
        products: {
          where: { lastScrapedAt: { not: null } },
          orderBy: { lastScrapedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ competitors })
  } catch (error: any) {
    console.error('Competitors fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { competitorKey, customName, customDomain, customLogo, customColor } = body

    let data: any = {
      userId: session.user.id,
    }

    if (competitorKey && COMPETITOR_CONFIGS[competitorKey]) {
      const config = COMPETITOR_CONFIGS[competitorKey]
      data.name = config.name
      data.domain = config.domain
      data.logo = config.logo
      data.color = config.color
    } else if (customName && customDomain) {
      data.name = customName
      data.domain = customDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
      data.logo = customLogo || null
      data.color = customColor || '#1F3A5F'
    } else {
      return NextResponse.json({ error: 'Invalid competitor data' }, { status: 400 })
    }

    const existing = await db.competitor.findFirst({
      where: { userId: session.user.id, domain: data.domain },
    })

    if (existing) {
      return NextResponse.json({ error: 'Competitor already exists', competitor: existing }, { status: 409 })
    }

    const competitor = await db.competitor.create({ data })

    return NextResponse.json({ competitor }, { status: 201 })
  } catch (error: any) {
    console.error('Competitor create error:', error)
    return NextResponse.json({ error: 'Failed to create competitor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, active } = body

    if (!id) {
      return NextResponse.json({ error: 'Competitor ID required' }, { status: 400 })
    }

    const competitor = await db.competitor.updateMany({
      where: { id, userId: session.user.id },
      data: { active: active ?? true },
    })

    return NextResponse.json({ competitor })
  } catch (error: any) {
    console.error('Competitor update error:', error)
    return NextResponse.json({ error: 'Failed to update competitor' }, { status: 500 })
  }
}
