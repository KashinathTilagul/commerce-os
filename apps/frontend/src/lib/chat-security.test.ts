import test from 'node:test'
import assert from 'node:assert/strict'
import { checkRateLimit, sanitizeInput } from './security'
import { getOrCreateChannel } from './chat'
import { db } from './db'

test('aiChat rate limiting caps rapid chat calls and distinguishes IP buckets', () => {
  const testIp = '198.51.100.42'
  const chatPath = '/api/chat/messages'

  // Should allow first 30 requests
  for (let i = 0; i < 30; i++) {
    const res = checkRateLimit(testIp, chatPath)
    assert.equal(res.allowed, true, `Request ${i + 1} should be allowed`)
  }

  // 31st request should be rejected
  const rejected = checkRateLimit(testIp, chatPath)
  assert.equal(rejected.allowed, false)
  assert.ok(rejected.retryAfter > 0)

  // Different IP should still be allowed
  const otherIpRes = checkRateLimit('198.51.100.43', chatPath)
  assert.equal(otherIpRes.allowed, true)
})

test('chat input sanitization strips script tags and caps length', () => {
  const dirty = '<script>alert("xss")</script>Hello <b>team</b>! <img src=x onerror=alert(1)>'
  const clean = sanitizeInput(dirty, { maxLength: 100 })
  assert.equal(clean.includes('<script>'), false)
  assert.equal(clean.includes('onerror'), false)
  assert.ok(clean.includes('Hello'))

  const longText = 'a'.repeat(5000)
  const truncated = sanitizeInput(longText, { maxLength: 4000 })
  assert.equal(truncated.length, 4000)
})

test('getOrCreateChannel guarantees organization scoping', async () => {
  const calls: any[] = []
  const originalFindFirst = db.channel.findFirst
  const originalCreate = db.channel.create

  // Mock Prisma methods
  db.channel.findFirst = (async (args: any) => {
    calls.push({ action: 'findFirst', args })
    return null
  }) as any

  db.channel.create = (async (args: any) => {
    calls.push({ action: 'create', args })
    return { id: 'c1', organizationId: args.data.organizationId, name: args.data.name, type: args.data.type }
  }) as any

  try {
    const orgA = 'org-tenant-a'
    const orgB = 'org-tenant-b'

    const channelA = await getOrCreateChannel(orgA, 'Company')
    assert.ok(channelA)
    assert.equal(channelA.organizationId, orgA)

    const channelB = await getOrCreateChannel(orgB, 'Company')
    assert.ok(channelB)
    assert.equal(channelB.organizationId, orgB)

    // Verify both calls strictly passed organizationId in the filter and data
    assert.equal(calls[0].args.where.organizationId, orgA)
    assert.equal(calls[1].args.data.organizationId, orgA)
    assert.equal(calls[2].args.where.organizationId, orgB)
    assert.equal(calls[3].args.data.organizationId, orgB)
  } finally {
    db.channel.findFirst = originalFindFirst
    db.channel.create = originalCreate
  }
})
