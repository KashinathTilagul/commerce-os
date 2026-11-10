import assert from 'node:assert/strict'
import test from 'node:test'
import { z } from 'zod'

process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test'

test('toJSONSchema serializes Zod v4 object schemas with properties and required keys', async () => {
  const { toJSONSchema } = await import('./ai-router')
  const Schema = z.object({
    reply: z.string(),
    intent: z.enum(['answer', 'work']),
    task: z.string().optional(),
  })

  const jsonSchema = toJSONSchema(Schema) as any
  assert.equal(jsonSchema.type, 'object')
  assert.deepEqual(jsonSchema.required, ['reply', 'intent'])
  assert.equal(jsonSchema.properties.reply.type, 'string')
  assert.deepEqual(jsonSchema.properties.intent.enum, ['answer', 'work'])
})

test('resolveTargetConfig uses provider default base URLs and rejects SSRF metadata URLs', async () => {
  const { resolveTargetConfig, validateProviderBaseUrl } = await import('./ai-router')

  assert.equal(resolveTargetConfig({ provider: 'openai', model: 'gpt-4o-mini' }).baseUrl, 'https://api.openai.com/v1')
  assert.equal(resolveTargetConfig({ provider: 'groq', model: 'llama-3.3-70b-versatile' }).baseUrl, 'https://api.groq.com/openai/v1')
  assert.equal(resolveTargetConfig({ provider: 'gemini', model: 'gemini-2.5-flash' }).baseUrl, 'https://generativelanguage.googleapis.com/v1beta/openai/')
  assert.equal(resolveTargetConfig({ provider: 'ollama', model: 'llama3.2' }).baseUrl, 'http://localhost:11434/v1')

  assert.throws(() => validateProviderBaseUrl('openai', 'http://169.254.169.254/latest'), /metadata/)
  assert.throws(() => validateProviderBaseUrl('openai', 'file:///etc/passwd'), /http or https/)
  assert.equal(validateProviderBaseUrl('openai', 'https://api.openai.com/v1/'), 'https://api.openai.com/v1')
})
