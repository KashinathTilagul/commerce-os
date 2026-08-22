import assert from 'node:assert/strict'
import test from 'node:test'
import { boundedEventPayload, identifyComposioDelivery } from './composio-trigger'

test('identifies a V3 Composio trigger without trusting its event data', () => {
  assert.deepEqual(identifyComposioDelivery({
    id: 'msg_123',
    type: 'composio.trigger.message',
    metadata: {
      connected_account_id: 'ca_123',
      user_id: 'org_123',
      trigger_slug: 'GITHUB_COMMIT_EVENT',
    },
    data: { connected_account_id: 'forged' },
  }), {
    connectedAccountId: 'ca_123',
    userId: 'org_123',
    triggerSlug: 'GITHUB_COMMIT_EVENT',
    eventType: 'composio.trigger.message',
  })
})

test('bounds stored event payloads', () => {
  const payload = boundedEventPayload({ body: 'x'.repeat(100) }, 40)
  assert.equal(JSON.parse(payload).truncated, true)
})

test('identifies an expired connected account lifecycle event', () => {
  assert.equal(identifyComposioDelivery({
    type: 'composio.connected_account.expired',
    data: { id: 'ca_expired' },
  }).connectedAccountId, 'ca_expired')
})
