import assert from 'node:assert/strict'
import test from 'node:test'
import { nextLaunchCode } from './product-launch-code'

test('allocates the next product launch code without reusing historical codes', () => {
  assert.equal(nextLaunchCode([]), 'LCH-001')
  assert.equal(nextLaunchCode(['LCH-001', 'LCH-009', 'other']), 'LCH-010')
})
