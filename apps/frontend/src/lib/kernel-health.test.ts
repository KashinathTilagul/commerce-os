import test from 'node:test'
import assert from 'node:assert/strict'
import { probeKernelHealth, resolveKernelUrl } from './kernel-health'

test('resolveKernelUrl returns null when neither FASTAPI_URL nor BROWSER_SIDECAR_URL is set', () => {
  assert.equal(resolveKernelUrl({}), null)
  assert.equal(resolveKernelUrl({ FASTAPI_URL: '   ', BROWSER_SIDECAR_URL: '' }), null)
})

test('resolveKernelUrl prefers FASTAPI_URL, falls back to BROWSER_SIDECAR_URL, and trims trailing slashes', () => {
  assert.equal(
    resolveKernelUrl({ FASTAPI_URL: 'https://kernel.abata.tech/', BROWSER_SIDECAR_URL: 'https://sidecar.abata.tech' }),
    'https://kernel.abata.tech'
  )
  assert.equal(
    resolveKernelUrl({ BROWSER_SIDECAR_URL: 'https://sidecar.abata.tech///' }),
    'https://sidecar.abata.tech'
  )
})

test('probeKernelHealth reports not_configured without calling fetch when unconfigured', async () => {
  let fetchCalled = false
  const result = await probeKernelHealth({}, async () => {
    fetchCalled = true
    throw new Error('fetch should not be called')
  })

  assert.equal(fetchCalled, false)
  assert.equal(result.status, 'not_configured')
  assert.equal(result.configured, false)
  assert.equal(result.latencyMs, 0)
})

test('probeKernelHealth reports healthy, degraded, and unreachable when configured', async () => {
  const healthy = await probeKernelHealth({ FASTAPI_URL: 'http://kernel:8000' }, async () =>
    new Response(JSON.stringify({ ok: true }), { status: 200 })
  )
  assert.equal(healthy.status, 'healthy')
  assert.equal(healthy.configured, true)
  assert.deepEqual(healthy.response, { ok: true })

  const degraded = await probeKernelHealth({ FASTAPI_URL: 'http://kernel:8000' }, async () =>
    new Response('err', { status: 502 })
  )
  assert.equal(degraded.status, 'degraded')
  assert.equal(degraded.statusCode, 502)

  const unreachable = await probeKernelHealth({ FASTAPI_URL: 'http://kernel:8000' }, async () => {
    throw new Error('connect ECONNREFUSED')
  })
  assert.equal(unreachable.status, 'unreachable')
  assert.equal(unreachable.error, 'connect ECONNREFUSED')
})
