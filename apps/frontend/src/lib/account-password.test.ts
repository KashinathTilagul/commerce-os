import assert from 'node:assert/strict'
import test from 'node:test'
import { validateNewPassword } from './account-password'

test('accepts passwords from 8 through 128 characters', () => {
  assert.equal(validateNewPassword('12345678'), null)
  assert.equal(validateNewPassword('x'.repeat(128)), null)
})

test('rejects missing, short, and oversized passwords', () => {
  assert.match(validateNewPassword(undefined) || '', /at least 8/)
  assert.match(validateNewPassword('short') || '', /at least 8/)
  assert.match(validateNewPassword('x'.repeat(129)) || '', /128/)
})
