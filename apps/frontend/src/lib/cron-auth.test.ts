import test from 'node:test'
import assert from 'node:assert/strict'
import { isCronAuthorized } from './cron-auth'

test('cron authentication fails closed for absent, empty and incorrect secrets', () => {
  const previous = process.env.CRON_SECRET
  try {
    delete process.env.CRON_SECRET
    assert.equal(isCronAuthorized(new Headers()), false)
    process.env.CRON_SECRET = ''
    assert.equal(isCronAuthorized(new Headers({ 'x-cron-secret': '' })), false)
    process.env.CRON_SECRET = 'test-secret'
    assert.equal(isCronAuthorized(new Headers()), false)
    assert.equal(isCronAuthorized(new Headers({ 'x-cron-secret': 'wrong' })), false)
    assert.equal(isCronAuthorized(new Headers({ 'x-cron-secret': 'test-secret' })), true)
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previous
  }
})
