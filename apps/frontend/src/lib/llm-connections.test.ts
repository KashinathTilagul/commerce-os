import assert from 'node:assert/strict'
import test from 'node:test'
import { testLlmConnection } from './llm-connections'

test('LLM connections become selectable from models returned by a live provider', async () => {
  const originalFetch = global.fetch
  global.fetch = async (url, init) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/models')
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-key')
    return Response.json({ data: [{ id: 'model-b' }, { id: 'text-embedding-3-small' }, { id: 'model-a' }] })
  }
  try {
    const result = await testLlmConnection('groq', 'test-key')
    assert.deepEqual(result.models, ['model-a', 'model-b'])
  } finally {
    global.fetch = originalFetch
  }
})

test('invalid provider credentials never become live', async () => {
  const originalFetch = global.fetch
  global.fetch = async () => new Response(null, { status: 401 })
  try {
    await assert.rejects(() => testLlmConnection('openrouter', 'bad-key'), /rejected the key/)
  } finally {
    global.fetch = originalFetch
  }
})
