import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hostDecision, hostRole } from './host-routing'

test('known hosts split marketing and app; everything else is a preview', () => {
  assert.equal(hostRole('commerce.abata.tech'), 'marketing')
  assert.equal(hostRole('www.commerce.abata.tech'), 'marketing')
  assert.equal(hostRole('app.commerce.abata.tech'), 'app')
  assert.equal(hostRole('localhost:3000'), 'preview')
  assert.equal(hostRole('commerce-os-git-preview.vercel.app'), 'preview')
})

test('marketing host keeps pages and sends auth and API to the app host', () => {
  assert.equal(hostDecision('marketing', '/', false), null)
  assert.equal(hostDecision('marketing', '/docs/getting-started', false), null)
  assert.equal(hostDecision('marketing', '/site/os/ai-workforce.webp', false), null)
  assert.deepEqual(hostDecision('marketing', '/login', false, '?callbackUrl=%2Fapp'), {
    location: 'https://app.commerce.abata.tech/login?callbackUrl=%2Fapp',
    status: 308,
  })
  assert.deepEqual(hostDecision('marketing', '/api/auth/signin', false), {
    location: 'https://app.commerce.abata.tech/api/auth/signin',
    status: 308,
  })
  assert.deepEqual(hostDecision('marketing', '/api/health', false), {
    location: 'https://app.commerce.abata.tech/api/health',
    status: 308,
  })
})

test('app host keeps the product and sends marketing pages to the landing host', () => {
  assert.deepEqual(hostDecision('app', '/', false), {
    location: 'https://app.commerce.abata.tech/login',
    status: 307,
  })
  assert.deepEqual(hostDecision('app', '/', true), {
    location: 'https://app.commerce.abata.tech/app',
    status: 307,
  })
  assert.equal(hostDecision('app', '/login', false), null)
  assert.equal(hostDecision('app', '/api/health', false), null)
  assert.deepEqual(hostDecision('app', '/demo', false), {
    location: 'https://commerce.abata.tech/demo',
    status: 308,
  })
  assert.deepEqual(hostDecision('app', '/docs/getting-started', false), {
    location: 'https://commerce.abata.tech/docs/getting-started',
    status: 308,
  })
})

test('preview hosts do not redirect', () => {
  assert.equal(hostDecision('preview', '/login', false), null)
  assert.equal(hostDecision('preview', '/demo', true), null)
  assert.equal(hostDecision('preview', '/', false), null)
})
