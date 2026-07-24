import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { crawlCompetitor, crawlSearchResults } from '@/lib/crawlers'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const competitorId = searchParams.get('competitorId')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = { userId: session.user.id }
    if (status) where.status = status
    if (competitorId) where.competitorId = competitorId

    const jobs = await db.scrapeJob.findMany({
      where,
      include: {
        competitor: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const pendingCount = await db.scrapeJob.count({
      where: { userId: session.user.id, status: 'pending' },
    })

    const runningCount = await db.scrapeJob.count({
      where: { userId: session.user.id, status: 'running' },
    })

    return NextResponse.json({ jobs, pendingCount, runningCount })
  } catch (error: any) {
    console.error('Jobs fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
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
      type = 'manual',
      urls,
      searchUrl,
      url,
      config = {},
      priority = 5,
    } = body

    if (!competitorId) {
      return NextResponse.json({ error: 'competitorId required' }, { status: 400 })
    }

    const competitor = await db.competitor.findFirst({
      where: { id: competitorId, userId: session.user.id },
    })

    if (!competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })
    }

    const jobConfig: any = config
    if (urls) jobConfig.urls = urls
    if (searchUrl || url) jobConfig.searchUrl = searchUrl || url

    const job = await db.scrapeJob.create({
      data: {
        userId: session.user.id,
        competitorId,
        type,
        status: 'pending',
        priority,
        config: JSON.stringify(jobConfig),
      },
    })

    if (type === 'discovery' && (searchUrl || url)) {
      await db.scrapeJob.update({
        where: { id: job.id },
        data: { status: 'running', startedAt: new Date() },
      })

      const competitorKey = competitor.domain.replace('.', '').toLowerCase()
      const result = await crawlSearchResults(competitorKey, searchUrl || url!, { maxProducts: 20 })

      await db.scrapeJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          productsFound: result.products.length,
          productsUpdated: 0,
          errorsCount: result.errors.length,
          result: JSON.stringify(result.stats),
        },
      })

      return NextResponse.json({ job, products: result.products }, { status: 201 })
    }

    return NextResponse.json({ job }, { status: 201 })
  } catch (error: any) {
    console.error('Job create error:', error)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { jobId, action } = body

    if (!jobId || !action) {
      return NextResponse.json({ error: 'jobId and action required' }, { status: 400 })
    }

    const job = await db.scrapeJob.findFirst({
      where: { id: jobId, userId: session.user.id },
      include: { competitor: true },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (action === 'start') {
      if (job.status !== 'pending') {
        return NextResponse.json({ error: 'Job already started' }, { status: 400 })
      }

      await db.scrapeJob.update({
        where: { id: jobId },
        data: { status: 'running', startedAt: new Date() },
      })

      const config = JSON.parse(job.config || '{}')
      let result

      if (config.searchUrl) {
        result = await crawlSearchResults(
          job.competitor!.domain.replace('.', ''),
          config.searchUrl,
          config.options
        )
      } else if (config.urls?.length > 0) {
        result = await crawlCompetitor(
          job.competitor!.domain.replace('.', ''),
          config.urls,
          config.options
        )
      } else {
        return NextResponse.json({ error: 'No URLs or searchUrl in config' }, { status: 400 })
      }

      const existingProducts = await db.competitorProduct.findMany({
        where: {
          userId: session.user.id,
          url: { in: result.products.map(p => p.url) },
        },
      })

      const existingMap = new Map(existingProducts.map(p => [p.url, p]))
      let productsUpdated = 0
      let productsCreated = 0

      for (const product of result.products) {
        const existing = existingMap.get(product.url)

        if (existing) {
          const oldPrice = existing.price
          const newPrice = product.price

          await db.competitorProduct.update({
            where: { id: existing.id },
            data: {
              name: product.name,
              price: product.price,
              mrp: product.mrp,
              discount: product.discount,
              imageUrl: product.imageUrl || existing.imageUrl,
              brand: product.brand || existing.brand,
              category: product.category || existing.category,
              inStock: product.inStock,
              sizes: product.sizes.join(','),
              colors: product.colors.join(','),
              rating: product.rating,
              reviewCount: product.reviewCount,
              lastScrapedAt: new Date(),
              scrapeStatus: 'success',
            },
          })

          await db.priceHistory.create({
            data: {
              productId: existing.id,
              price: product.price,
              mrp: product.mrp,
              discount: product.discount,
              inStock: product.inStock,
            },
          })

          if (oldPrice !== newPrice) {
            const changePercent = ((newPrice - oldPrice) / oldPrice) * 100

            if (Math.abs(changePercent) >= 5) {
              await db.priceAlert.create({
                data: {
                  productId: existing.id,
                  alertType: changePercent < 0 ? 'price_drop' : 'price_increase',
                  threshold: 5,
                  oldPrice,
                  newPrice,
                  changePercent,
                  changeAbsolute: Math.abs(newPrice - oldPrice),
                },
              })
            }
          }

          productsUpdated++
        } else {
          const competitorKey = job.competitor!.domain.replace('.', '').toLowerCase()

          try {
            await db.competitorProduct.create({
              data: {
                userId: session.user.id,
                competitorId: job.competitorId!,
                url: product.url,
                name: product.name,
                price: product.price,
                mrp: product.mrp,
                discount: product.discount,
                imageUrl: product.imageUrl,
                brand: product.brand,
                category: product.category,
                inStock: product.inStock,
                sizes: product.sizes.join(','),
                colors: product.colors.join(','),
                rating: product.rating,
                reviewCount: product.reviewCount,
                lastScrapedAt: new Date(),
                scrapeStatus: 'success',
              },
            })
            productsCreated++
          } catch (e) {
            // Skip duplicates
          }
        }
      }

      await db.scrapeJob.update({
        where: { id: jobId },
        data: {
          status: result.success ? 'completed' : 'failed',
          completedAt: new Date(),
          productsFound: result.products.length,
          productsUpdated: productsUpdated + productsCreated,
          errorsCount: result.errors.length,
          result: JSON.stringify(result.stats),
          error: result.errors.length > 0 ? result.errors.join('\n') : null,
        },
      })

      return NextResponse.json({
        job: await db.scrapeJob.findUnique({ where: { id: jobId } }),
        result: {
          ...result,
          productsCreated,
          productsUpdated,
        },
      })
    }

    if (action === 'cancel') {
      const updated = await db.scrapeJob.update({
        where: { id: jobId },
        data: { status: 'failed', error: 'Cancelled by user', completedAt: new Date() },
      })

      return NextResponse.json({ job: updated })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Job execution error:', error)
    return NextResponse.json({ error: 'Failed to execute job' }, { status: 500 })
  }
}
