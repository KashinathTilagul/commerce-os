import assert from 'node:assert/strict'
import test from 'node:test'

process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test'

test('OmniRoute URLs require a deployment allowlist and reject credential-bearing URLs', async () => {
  const { normalizeOmniRouteBaseUrl } = await import('./omniroute-config')
  const previousNodeEnv = process.env.NODE_ENV
  const previousBaseUrl = process.env.OMNIROUTE_BASE_URL
  const previousAllowed = process.env.OMNIROUTE_ALLOWED_BASE_URLS
  process.env.OMNIROUTE_ALLOWED_BASE_URLS = 'https://gateway.example/v1'

  assert.equal(normalizeOmniRouteBaseUrl('https://gateway.example/v1/'), 'https://gateway.example/v1')
  assert.throws(() => normalizeOmniRouteBaseUrl('file:///tmp/omniroute'), /http or https/)

  ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
  process.env.OMNIROUTE_BASE_URL = 'http://omniroute:20128/v1'
  assert.throws(() => normalizeOmniRouteBaseUrl('http://localhost:20128/v1'), /not allowed/)
  assert.throws(() => normalizeOmniRouteBaseUrl('http://169.254.169.254/latest'), /not allowed/)
  assert.throws(() => normalizeOmniRouteBaseUrl('https://attacker.example/v1'), /not allowed/)
  assert.throws(() => normalizeOmniRouteBaseUrl('https://user:pass@gateway.example/v1'), /credentials/)
  assert.equal(normalizeOmniRouteBaseUrl('http://omniroute:20128/v1'), 'http://omniroute:20128/v1')

  ;(process.env as Record<string, string | undefined>).NODE_ENV = previousNodeEnv
  if (previousBaseUrl === undefined) delete process.env.OMNIROUTE_BASE_URL
  else process.env.OMNIROUTE_BASE_URL = previousBaseUrl
  if (previousAllowed === undefined) delete process.env.OMNIROUTE_ALLOWED_BASE_URLS
  else process.env.OMNIROUTE_ALLOWED_BASE_URLS = previousAllowed
})

test('OmniRoute image catalogs are normalized without inventing model IDs', async () => {
  const { readOmniRouteImageModels } = await import('./omniroute-config')

  assert.deepEqual(readOmniRouteImageModels({
    data: [
      { id: 'openai/gpt-image-2', sizes: ['1024x1024'] },
      'together/black-forest-labs/FLUX.1-schnell-Free',
      { name: 'missing-id' },
    ],
  }), [
    { id: 'openai/gpt-image-2', name: 'openai/gpt-image-2', sizes: ['1024x1024'] },
    { id: 'together/black-forest-labs/FLUX.1-schnell-Free', name: 'together/black-forest-labs/FLUX.1-schnell-Free', sizes: [] },
  ])
})
