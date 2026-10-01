import { test, mock } from 'bun:test'
import assert from 'node:assert/strict'

let role = 'MEMBER'
const removed = []
mock.module('next-auth', () => ({ getServerSession: async () => ({ user: { id: 'user-1' } }) }))
mock.module('@/lib/auth', () => ({ authOptions: {} }))
const personalModel = name => ({
  deleteMany: async ({ where }) => { assert.deepEqual(where, { userId: 'user-1' }); removed.push(name) },
})
const tx = {
  auditLog: personalModel('audit'), session: personalModel('session'), account: personalModel('account'),
  user: { delete: async ({ where }) => { assert.deepEqual(where, { id: 'user-1' }); removed.push('user') } },
}
mock.module('@/lib/db', () => ({ db: {
  user: { findUnique: async () => ({ organizationId: 'org-1', orgRole: role }) },
  $transaction: async work => work(new Proxy(tx, { get(target, key) {
    assert.ok(key in target, `Organization model ${String(key)} must not be deleted`)
    return target[key]
  } })),
} }))
const { POST } = await import('../app/api/account/delete/route')

test('member deletion removes only personal records and blocks founder deletion', async () => {
  assert.equal((await POST(new Request('https://os.example/api/account/delete', { method: 'POST' }))).status, 200)
  assert.deepEqual(removed, ['audit', 'session', 'account', 'user'])
  role = 'FOUNDER'
  assert.equal((await POST(new Request('https://os.example/api/account/delete', { method: 'POST' }))).status, 409)
  assert.equal(removed.length, 4)
})
