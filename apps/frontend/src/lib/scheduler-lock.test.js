import { test, mock } from 'bun:test'
import assert from 'node:assert/strict'

let acquired = false
let released = 0
mock.module('ioredis', () => ({ default: class {
  async set() { return acquired ? 'OK' : null }
  async eval() { released++; return 1 }
} }))
const { withSchedulerLock } = await import('./scheduler-lock')

test('scheduled work requires Redis and an acquired lock, releasing on failure', async () => {
  delete process.env.REDIS_URL
  await assert.rejects(withSchedulerLock('test', async () => {}), /REDIS_URL/)
  process.env.REDIS_URL = 'redis://test'
  let runs = 0
  await withSchedulerLock('test', async () => { runs++ })
  assert.equal(runs, 0)
  acquired = true
  await assert.rejects(withSchedulerLock('test', async () => { throw new Error('job failed') }), /job failed/)
  assert.equal(released, 1)
})
