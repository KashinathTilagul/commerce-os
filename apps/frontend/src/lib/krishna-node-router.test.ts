import assert from 'node:assert/strict'
import test from 'node:test'
import { parseKrishnaNodeResponse, runKrishnaNodeWorkflow, validKrishnaWebhookPath } from './krishna-node-router'

test('accepts only internal n8n webhook slugs', () => {
  assert.equal(validKrishnaWebhookPath('krishna-llm-nodes'), true)
  assert.equal(validKrishnaWebhookPath('team_router_2'), true)
  assert.equal(validKrishnaWebhookPath('https://attacker.example/hook'), false)
  assert.equal(validKrishnaWebhookPath('../admin'), false)
})

test('normalizes direct and n8n chain responses', () => {
  assert.deepEqual(parseKrishnaNodeResponse({ spoken: 'Ready.', action: { type: 'none' } }), {
    spoken: 'Ready.',
    action: { type: 'none' },
  })
  assert.deepEqual(parseKrishnaNodeResponse([{ output: '```json\n{"spoken":"Mapped.","action":{"type":"none"}}\n```' }]), {
    spoken: 'Mapped.',
    action: { type: 'none' },
  })
})

test('rejects empty workflow output', () => {
  assert.throws(() => parseKrishnaNodeResponse({ output: '' }), /no spoken response/)
})

test('calls only the configured internal n8n webhook with the shared secret', async () => {
  const previousFetch = global.fetch
  const previousUrl = process.env.N8N_INTERNAL_WEBHOOK_URL
  const previousSecret = process.env.N8N_EKVAAR_WEBHOOK_SECRET
  process.env.N8N_INTERNAL_WEBHOOK_URL = 'http://n8n:5678/automation/webhook/'
  process.env.N8N_EKVAAR_WEBHOOK_SECRET = 'test-secret'
  global.fetch = async (url, init) => {
    assert.equal(url, 'http://n8n:5678/automation/webhook/krishna-llm-nodes')
    assert.equal(new Headers(init?.headers).get('x-ekvaar-secret'), 'test-secret')
    const body = JSON.parse(String(init?.body))
    assert.equal(body.organizationId, 'org-1')
    assert.equal(body.chatInput, 'Hello')
    return new Response(JSON.stringify({ spoken: 'Ready.', action: { type: 'none' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  try {
    assert.deepEqual(await runKrishnaNodeWorkflow({
      organizationId: 'org-1', userId: 'user-1', message: 'Hello', system: 'Be concise.', context: '', webhookPath: 'krishna-llm-nodes',
    }), { spoken: 'Ready.', action: { type: 'none' } })
  } finally {
    global.fetch = previousFetch
    if (previousUrl === undefined) delete process.env.N8N_INTERNAL_WEBHOOK_URL
    else process.env.N8N_INTERNAL_WEBHOOK_URL = previousUrl
    if (previousSecret === undefined) delete process.env.N8N_EKVAAR_WEBHOOK_SECRET
    else process.env.N8N_EKVAAR_WEBHOOK_SECRET = previousSecret
  }
})
