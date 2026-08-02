import assert from 'node:assert/strict'
import test from 'node:test'
import { filterSensitiveData } from './sensitive-data'

test('filterSensitiveData preserves nested dates while redacting secrets', () => {
  const createdAt = new Date('2026-08-02T10:00:00.000Z')
  const filtered = filterSensitiveData({ customer: { createdAt, accessToken: 'private' } })

  assert.deepEqual(filtered, {
    customer: { createdAt: createdAt.toISOString(), accessToken: '***REDACTED***' },
  })
})
