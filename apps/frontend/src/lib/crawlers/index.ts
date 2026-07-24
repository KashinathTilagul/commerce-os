import { PlaywrightCrawler, Dataset } from 'crawlee'
import type { ScrapedProduct, ScrapeResult, CompetitorSelectors } from './types'
import { COMPETITOR_CONFIGS } from './types'

function parsePrice(text: string): number {
  if (!text) return 0
  const cleaned = text.replace(/[^\d.]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

function parseDiscount(text: string): number {
  if (!text) return 0
  const match = text.match(/(\d+)%?/)
  return match ? parseInt(match[1]) : 0
}

function extractSizes(page: any, selector: string): string[] {
  try {
    const sizes: string[] = []
    const elements = page.locator(selector)
    const count = elements.count()
    for (let i = 0; i < count; i++) {
      const size = elements.nth(i).textContent()?.trim()
      if (size && !sizes.includes(size)) sizes.push(size)
    }
    return sizes
  } catch {
    return []
  }
}

async function scrapeProductPage(page: any, selectors: CompetitorSelectors, baseUrl: string): Promise<ScrapedProduct | null> {
  try {
    const name = await page.locator(selectors.name).first().textContent()
    if (!name) return null

    const priceText = await page.locator(selectors.price).first().textContent()
    const mrpText = await page.locator(selectors.mrp).first().textContent()
    const discountText = await page.locator(selectors.discount).first().textContent()

    const imageUrl = await page.locator(selectors.image).first().getAttribute('src')
    const brand = await page.locator(selectors.brand).first().textContent()
    const category = await page.locator(selectors.category).first().textContent()

    const inStockEl = await page.locator(selectors.inStock).count()
    const inStock = inStockEl === 0

    const ratingText = await page.locator(selectors.rating).first().textContent()
    const reviewCountText = await page.locator(selectors.reviewCount).first().textContent()

    const sizes = extractSizes(page, selectors.sizes)
    const colors = extractSizes(page, selectors.colors)

    const relativeUrl = await page.locator(selectors.url).first().getAttribute('href')
    const url = relativeUrl ? (relativeUrl.startsWith('http') ? relativeUrl : `${baseUrl}${relativeUrl}`) : ''

    return {
      name: name.trim(),
      url,
      price: parsePrice(priceText || ''),
      mrp: parsePrice(mrpText || ''),
      discount: parseDiscount(discountText || ''),
      imageUrl: imageUrl || undefined,
      brand: brand?.trim() || undefined,
      category: category?.trim() || undefined,
      inStock,
      sizes,
      colors,
      rating: parsePrice(ratingText || ''),
      reviewCount: parsePrice(reviewCountText || ''),
    }
  } catch (e) {
    return null
  }
}

export async function crawlCompetitor(
  competitorKey: string,
  urls: string[],
  options?: {
    maxConcurrency?: number
    requestTimeout?: number
    headless?: boolean
  }
): Promise<ScrapeResult> {
  const config = COMPETITOR_CONFIGS[competitorKey]
  if (!config) {
    return {
      success: false,
      products: [],
      errors: [`Unknown competitor: ${competitorKey}`],
      stats: { pagesVisited: 0, productsFound: 0, productsUpdated: 0, errors: 1, durationMs: 0 },
    }
  }

  const startTime = Date.now()
  const products: ScrapedProduct[] = []
  const errors: string[] = []
  let pagesVisited = 0

  const crawler = new PlaywrightCrawler({
    headless: options?.headless ?? true,
    maxConcurrency: options?.maxConcurrency ?? 3,
    requestHandlerTimeoutSecs: options?.requestTimeout ?? 60,
    requestHandler: async ({ page, request, log }) => {
      try {
        log.info(`Scraping: ${request.url}`)
        await page.waitForLoadState('networkidle', { timeout: 30000 })

        const product = await scrapeProductPage(page, config.selectors, config.baseUrl)
        if (product) {
          products.push(product)
          log.info(`Found: ${product.name} - ₹${product.price}`)
        }

        pagesVisited++
      } catch (e: any) {
        errors.push(`${request.url}: ${e.message}`)
        log.error(`Error scraping ${request.url}: ${e.message}`)
      }
    },
    failedRequestHandler: async ({ request, log }) => {
      errors.push(`Failed: ${request.url}`)
      log.error(`Failed request: ${request.url}`)
    },
  })

  try {
    await crawler.run(urls)
  } catch (e: any) {
    errors.push(`Crawler error: ${e.message}`)
  }

  const durationMs = Date.now() - startTime

  return {
    success: errors.length === 0,
    products,
    errors,
    stats: {
      pagesVisited,
      productsFound: products.length,
      productsUpdated: products.length,
      errors: errors.length,
      durationMs,
    },
  }
}

export async function crawlSearchResults(
  competitorKey: string,
  searchUrl: string,
  options?: {
    maxPages?: number
    maxProducts?: number
  }
): Promise<ScrapeResult> {
  const config = COMPETITOR_CONFIGS[competitorKey]
  if (!config) {
    return {
      success: false,
      products: [],
      errors: [`Unknown competitor: ${competitorKey}`],
      stats: { pagesVisited: 0, productsFound: 0, productsUpdated: 0, errors: 1, durationMs: 0 },
    }
  }

  const startTime = Date.now()
  const products: ScrapedProduct[] = []
  const errors: string[] = []
  let pagesVisited = 0
  const maxProducts = options?.maxProducts ?? 100

  const crawler = new PlaywrightCrawler({
    headless: true,
    maxConcurrency: 2,
    requestHandler: async ({ page, request, enqueueLinks, log }) => {
      try {
        log.info(`Searching: ${request.url}`)
        await page.waitForLoadState('networkidle', { timeout: 30000 })

        const productCards = await page.locator(config.selectors.productCard).all()
        log.info(`Found ${productCards.length} products on page`)

        for (const card of productCards) {
          if (products.length >= maxProducts) break

          try {
            const name = await card.locator(config.selectors.name).first().textContent()
            const priceText = await card.locator(config.selectors.price).first().textContent()
            const mrpText = await card.locator(config.selectors.mrp).first().textContent()
            const imageUrl = await card.locator(config.selectors.image).first().getAttribute('src')
            const relativeUrl = await card.locator(config.selectors.url).first().getAttribute('href')
            const url = relativeUrl ? (relativeUrl.startsWith('http') ? relativeUrl : `${config.baseUrl}${relativeUrl}`) : ''

            const brand = await card.locator(config.selectors.brand).first().textContent()
            const ratingText = await card.locator(config.selectors.rating).first().textContent()

            if (name && url) {
              products.push({
                name: name.trim(),
                url,
                price: parsePrice(priceText || ''),
                mrp: parsePrice(mrpText || ''),
                discount: parseDiscount(await card.locator(config.selectors.discount).first().textContent() || ''),
                imageUrl: imageUrl || undefined,
                brand: brand?.trim() || undefined,
                inStock: true,
                sizes: [],
                colors: [],
                rating: parsePrice(ratingText || ''),
                reviewCount: 0,
              })
            }
          } catch (e) {
            // Skip this product
          }
        }

        pagesVisited++

        if (products.length < maxProducts) {
          await enqueueLinks({
            selector: 'a[href*="page"]',
            baseUrl: config.baseUrl,
          })
        }
      } catch (e: any) {
        errors.push(`${request.url}: ${e.message}`)
      }
    },
  })

  try {
    await crawler.run([searchUrl])
  } catch (e: any) {
    errors.push(`Crawler error: ${e.message}`)
  }

  const durationMs = Date.now() - startTime

  return {
    success: errors.length === 0,
    products: products.slice(0, maxProducts),
    errors,
    stats: {
      pagesVisited,
      productsFound: products.length,
      productsUpdated: products.length,
      errors: errors.length,
      durationMs,
    },
  }
}

export { COMPETITOR_CONFIGS }
