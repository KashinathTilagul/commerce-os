import { test, expect, mock } from 'bun:test'

const pending = []
const written = []
let query
mock.module('next/server', () => ({ after: fn => pending.push(fn), NextResponse: { json: value => value } }))
mock.module('@/lib/auth-guard', () => ({ requireOrganization: async () => ({ success: true, organizationId: 'org', user: { id: 'user' } }) }))
mock.module('@/lib/security', () => ({ getClientIP: () => 'test', checkRateLimit: () => ({ allowed: true }), sanitizeInput: text => text }))
mock.module('@/lib/chat', () => ({ getOrCreateChannel: async () => ({ id: 'channel', name: 'CEO' }) }))
mock.module('@/lib/business-snapshot', () => ({ getLiveBusinessSnapshot: async () => '' }))
mock.module('@/lib/ai-router', () => ({ routeObject: async () => { throw new Error('Provider unavailable') } }))
mock.module('@/lib/db', () => ({ db: {
  agent: { findFirst: async () => ({ id: 'agent', isHuman: false }) },
  message: {
    create: async ({ data }) => { written.push(data); return { ...data, id: 'message' } },
    findMany: async args => { query = args; return [{ id: 'new' }, { id: 'old' }] },
  },
} }))

test('sending does not await AI, provider failures are visible, latest replies remain readable', async () => {
  const { POST } = await import('../app/api/chat/messages/route')
  const req = { nextUrl: { pathname: '/api/chat/messages' }, json: async () => ({ channelId: 'CEO', content: 'Hello' }) }
  const response = await POST(req)
  expect(response.message.content).toBe('Hello')
  expect(written.length).toBe(1)
  expect(pending.length).toBe(1)
  await pending[0]()
  expect(written[1].content).toContain('could not generate a reply')
  const { GET } = await import('../app/api/chat/channels/[channelId]/messages/route')
  const history = await GET({ nextUrl: { pathname: '/api/chat/channels/CEO/messages' }, url: 'http://localhost/api/chat/channels/CEO/messages' }, { params: Promise.resolve({ channelId: 'CEO' }) })
  expect(query.where).toEqual({ channelId: 'channel' })
  expect(query.orderBy[0]).toEqual({ createdAt: 'desc' })
  expect(history.messages.map(m => m.id)).toEqual(['old', 'new'])
})
