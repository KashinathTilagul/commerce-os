import assert from 'node:assert/strict'
import test from 'node:test'

process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test'

test('OmniRoute URL normalization removes trailing slashes and blocks production localhost', async () => {
  const { normalizeOmniRouteBaseUrl } = await import('./omniroute-config')
  const previousNodeEnv = process.env.NODE_ENV
  const previousBaseUrl = process.env.OMNIROUTE_BASE_URL

  assert.equal(normalizeOmniRouteBaseUrl('https://gateway.example/v1/'), 'https://gateway.example/v1')
  assert.throws(() => normalizeOmniRouteBaseUrl('file:///tmp/omniroute'), /http or https/)

  ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
  process.env.OMNIROUTE_BASE_URL = 'http://omniroute:20128/v1'
  assert.equal(normalizeOmniRouteBaseUrl('http://localhost:20128/v1'), 'http://omniroute:20128/v1')

  ;(process.env as Record<string, string | undefined>).NODE_ENV = previousNodeEnv
  if (previousBaseUrl === undefined) delete process.env.OMNIROUTE_BASE_URL
  else process.env.OMNIROUTE_BASE_URL = previousBaseUrl
})
