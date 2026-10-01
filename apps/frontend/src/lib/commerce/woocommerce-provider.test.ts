import assert from 'node:assert/strict'
import test from 'node:test'
import { CommerceMapper } from './mapper'
import { WooCommerceProvider } from './woocommerce-provider'

test('preserves WooCommerce order status, payment, amount, and date', () => {
  const order = CommerceMapper.toCanonicalOrder({
    id: 7,
    number: '7',
    total: '125.50',
    status: 'cancelled',
    date_paid_gmt: '2026-06-02T00:00:00',
    date_created_gmt: '2026-06-01T00:00:00',
  }, 'org-1')

  assert.equal(order.status, 'CANCELLED')
  assert.equal(order.paymentStatus, 'PAID')
  assert.equal(order.total, 125.5)
  assert.equal(order.createdAt.toISOString(), '2026-06-01T00:00:00.000Z')
})

test('paginates via per_page/page with X-WP-TotalPages and Basic auth', async () => {
  process.env.WOOCOMMERCE_URL = 'https://store.example'
  process.env.WOOCOMMERCE_ORGANIZATION_ID = 'org-1'
  process.env.WOOCOMMERCE_CONSUMER_KEY = 'ck_test'
  process.env.WOOCOMMERCE_CONSUMER_SECRET = 'cs_test'

  const calls: { url: string, auth: string }[] = []
  const originalFetch = global.fetch
  global.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), auth: init?.headers?.Authorization || '' })
    return new Response(JSON.stringify([{ id: 1, stock_quantity: 4 }, { id: 2, stock_quantity: null }]), {
      headers: { 'X-WP-TotalPages': '3' },
    })
  }) as any

  try {
    const provider = new WooCommerceProvider()
    await assert.rejects(provider.syncProducts({ organizationId: 'other-org' }), /not configured/)
    assert.equal(calls.length, 0)

    const page1 = await provider.syncProducts({ organizationId: 'org-1', limit: 2 })
    assert.equal(page1.hasMore, true)
    assert.equal(page1.nextCursor, '2')
    assert.equal(page1.items.length, 2)

    const lastPage = await provider.syncOrders({ organizationId: 'org-1', limit: 2, cursor: '3' })
    assert.equal(lastPage.hasMore, false)
    assert.equal(lastPage.nextCursor, undefined)

    const inventory = await provider.syncInventory({ organizationId: 'org-1', limit: 2 })
    assert.deepEqual(inventory.items.map((i: any) => i.stock_quantity), [4, 0])

    assert.ok(calls[0].url.endsWith('/wp-json/wc/v3/products?per_page=2&page=1'))
    assert.ok(calls[1].url.endsWith('/wp-json/wc/v3/orders?per_page=2&page=3'))
    assert.ok(calls[0].auth.startsWith('Basic '))
  } finally {
    global.fetch = originalFetch
  }
})
