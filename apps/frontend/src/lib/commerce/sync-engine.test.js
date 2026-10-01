import { test, mock } from 'bun:test'
import assert from 'node:assert/strict'

const persisted = []
mock.module('@/lib/db', () => ({ db: { syncState: { upsert: async () => {} }, event: { create: async () => {} } } }))
mock.module('./hub', () => ({ CommerceHub: { persistProduct: async (raw) => { persisted.push(raw.id) } } }))
const { SyncEngine } = await import('./sync-engine')

test('full entity sync follows all pages and rejects repeated cursors', async () => {
  const provider = {
    providerName: 'test',
    syncProducts: async ({ cursor }) => cursor
      ? { items: [{ id: 2 }], hasMore: false }
      : { items: [{ id: 1 }], hasMore: true, nextCursor: '2' },
  }
  const engine = new SyncEngine(provider, 'org-1')
  assert.equal((await engine.runSync('PRODUCT')).processed, 2)
  assert.deepEqual(persisted, [1, 2])
  provider.syncProducts = async () => ({ items: [], hasMore: true, nextCursor: '2' })
  await assert.rejects(engine.runSync('PRODUCT'), /pagination cursor/)
})
