import test from 'node:test'
import assert from 'node:assert/strict'
import { isViewerWriteBlocked } from './viewer-guard'

test('viewers can read but not write', () => {
  assert.equal(isViewerWriteBlocked('GET', '/api/products', 'VIEWER'), false)
  assert.equal(isViewerWriteBlocked('POST', '/api/products', 'VIEWER'), true)
  assert.equal(isViewerWriteBlocked('DELETE', '/api/orders', 'VIEWER'), true)
  assert.equal(isViewerWriteBlocked('POST', '/api/auth/callback/credentials', 'VIEWER'), false)
})

test('other roles are unaffected', () => {
  assert.equal(isViewerWriteBlocked('POST', '/api/products', 'FOUNDER'), false)
  assert.equal(isViewerWriteBlocked('POST', '/api/products', 'MEMBER'), false)
  assert.equal(isViewerWriteBlocked('POST', '/api/products', undefined), false)
})
