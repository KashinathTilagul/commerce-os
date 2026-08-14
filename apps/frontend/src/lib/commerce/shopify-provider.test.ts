import assert from 'node:assert/strict'
import test from 'node:test'
import { CommerceMapper } from './mapper'

test('preserves Shopify order status, payment, amount, and date', () => {
  const order = CommerceMapper.toCanonicalOrder({
    id: 7,
    name: '#7',
    total_price: '125.50',
    financial_status: 'paid',
    cancelled_at: '2026-07-01T00:00:00Z',
    created_at: '2026-06-01T00:00:00Z',
  }, 'org-1')

  assert.equal(order.status, 'CANCELLED')
  assert.equal(order.paymentStatus, 'PAID')
  assert.equal(order.total, 125.5)
  assert.equal(order.createdAt.toISOString(), '2026-06-01T00:00:00.000Z')
})
