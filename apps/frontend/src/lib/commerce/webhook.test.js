import { test, mock } from 'bun:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'

let lookup
mock.module('@/lib/db', () => ({ db: { order: { findFirst: async (query) => { lookup = query; return null } } } }))
const { POST } = await import('../../app/api/woocommerce/webhook/route')

test('webhook fails closed and valid signatures use tenant-scoped lookups', async () => {
  const body = JSON.stringify({ id: 1, number: '1' })
  const request = (signature = '') => new Request('https://os.example/api/woocommerce/webhook', {
    method: 'POST', body, headers: { 'x-wc-webhook-topic': 'order.updated', 'x-wc-webhook-signature': signature },
  })
  delete process.env.WOOCOMMERCE_WEBHOOK_SECRET
  process.env.WOOCOMMERCE_ORGANIZATION_ID = 'org-1'
  assert.equal((await POST(request())).status, 503)
  process.env.WOOCOMMERCE_WEBHOOK_SECRET = 'test-secret'
  assert.equal((await POST(request('invalid'))).status, 401)
  assert.equal(lookup, undefined)
  const signature = createHmac('sha256', 'test-secret').update(body).digest('base64')
  assert.equal((await POST(request(signature))).status, 200)
  assert.deepEqual(lookup.where, { orderNumber: '1', organizationId: 'org-1' })
})
