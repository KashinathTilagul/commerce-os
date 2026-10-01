import { CommerceProvider, SyncOptions, SyncResult } from './provider'

// WooCommerce caps per_page at 100
const MAX_PER_PAGE = 100

function baseUrl(): string {
  const url = process.env.WOOCOMMERCE_URL
  if (!url) throw new Error('WooCommerce Provider Error: WOOCOMMERCE_URL is not set')
  return `${url.replace(/\/+$/, '')}/wp-json/wc/v3`
}

function authHeader(): string {
  const key = process.env.WOOCOMMERCE_CONSUMER_KEY
  const secret = process.env.WOOCOMMERCE_CONSUMER_SECRET
  if (!key || !secret) {
    throw new Error('WooCommerce Provider Error: WOOCOMMERCE_CONSUMER_KEY / WOOCOMMERCE_CONSUMER_SECRET are not set')
  }
  return `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`
}

export class WooCommerceProvider implements CommerceProvider {
  providerName = 'woocommerce'

  // Page-number pagination: cursor is the page to fetch, hasMore from X-WP-TotalPages.
  private async fetchPage(path: string, options: SyncOptions): Promise<SyncResult> {
    if (!process.env.WOOCOMMERCE_ORGANIZATION_ID || options.organizationId !== process.env.WOOCOMMERCE_ORGANIZATION_ID) {
      throw new Error('WooCommerce store is not configured for this organization')
    }
    const page = Math.max(parseInt(options.cursor || '1', 10) || 1, 1)
    const perPage = Math.min(options.limit || MAX_PER_PAGE, MAX_PER_PAGE)
    const res = await fetch(`${baseUrl()}${path}?per_page=${perPage}&page=${page}`, {
      headers: { Authorization: authHeader() },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      throw new Error(`WooCommerce Provider Error: ${res.status} ${res.statusText} on ${path}`)
    }
    const body = await res.json()
    const items = Array.isArray(body) ? body : []
    const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '', 10)
    const hasMore = Number.isFinite(totalPages) ? page < totalPages : items.length === perPage
    return {
      items,
      hasMore,
      nextCursor: hasMore ? String(page + 1) : undefined,
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${baseUrl()}/products?per_page=1`, { headers: { Authorization: authHeader() }, signal: AbortSignal.timeout(15_000), redirect: 'error' })
      return res.ok
    } catch {
      return false
    }
  }

  supports(feature: string): boolean {
    return ['products', 'orders', 'customers', 'inventory'].includes(feature)
  }

  async connect(): Promise<boolean> {
    // Static consumer key/secret from env — nothing to hand-shake beyond a reachability check.
    return this.healthCheck()
  }

  async disconnect(): Promise<boolean> {
    return true
  }

  async syncProducts(options: SyncOptions): Promise<SyncResult> {
    return this.fetchPage('/products', options)
  }

  async syncOrders(options: SyncOptions): Promise<SyncResult> {
    return this.fetchPage('/orders', options)
  }

  async syncCustomers(options: SyncOptions): Promise<SyncResult> {
    return this.fetchPage('/customers', options)
  }

  async syncInventory(options: SyncOptions): Promise<SyncResult> {
    // ponytail: WooCommerce has no inventory endpoint — stock lives on the product
    // (stock_quantity), so inventory is a projection of /products
    const result = await this.fetchPage('/products', options)
    return {
      ...result,
      items: result.items.map((p: any) => ({ id: p.id, sku: p.sku, stock_quantity: p.stock_quantity ?? 0 })),
    }
  }

  async webhook(payload: any): Promise<void> {
    // Signature verification and order updates live in /api/woocommerce/webhook
    // (same split the Shopify setup used).
  }
}
