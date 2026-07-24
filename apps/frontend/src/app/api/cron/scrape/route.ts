import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { crawlCompetitor } from '@/lib/crawlers'

const CRON_SECRET = process.env.CRON_SECRET || 'ekvaar-scrape-secret'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const providedSecret = authHeader?.replace('Bearer ', '')

    if (providedSecret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const competitors = await db.competitor.findMany({
      where: { active: true },
      include: {
        products: {
          where: { url: { not: '' } },
          select: { url: true, id: true },
        },
      },
    })

    if (competitors.length === 0) {
      return NextResponse.json({ message: 'No active competitors', jobs: [] })
    }

    const jobs = []

    for (const competitor of competitors) {
      if (competitor.products.length === 0) continue

      const competitorKey = competitor.domain.replace('.', '').toLowerCase()

      const job = await db.scrapeJob.create({
        data: {
          userId: competitor.userId,
          competitorId: competitor.id,
          type: 'daily_sync',
          status: 'pending',
          priority: 5,
          config: JSON.stringify({
            urls: competitor.products.map(p => p.url),
          }),
        },
      })

      jobs.push(job.id)

      try {
        await db.scrapeJob.update({
          where: { id: job.id },
          data: { status: 'running', startedAt: new Date() },
        })

        const result = await crawlCompetitor(competitorKey, competitor.products.map(p => p.url), {
          maxConcurrency: 3,
          headless: true,
        })

        let productsUpdated = 0

        for (const product of result.products) {
          try {
            const existing = await db.competitorProduct.findFirst({
              where: { userId: competitor.userId, url: product.url },
            })

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
                  brand: product.brand,
                  inStock: product.inStock,
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

              if (oldPrice !== newPrice && oldPrice > 0) {
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
            }
          } catch (e) {
            // Skip
          }
        }

        await db.scrapeJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            productsFound: result.products.length,
            productsUpdated,
            errorsCount: result.errors.length,
            result: JSON.stringify(result.stats),
          },
        })
      } catch (e: any) {
        await db.scrapeJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            completedAt: new Date(),
            error: e.message,
          },
        })
      }
    }

    return NextResponse.json({
      message: 'Daily sync completed',
      jobsCreated: jobs.length,
      jobs,
    })
  } catch (error: any) {
    console.error('Daily sync error:', error)
    return NextResponse.json({ error: 'Daily sync failed', details: error.message }, { status: 500 })
  }
}
