import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveDirectProvider } from './direct-provider'

test('OmniRoute stays the default when OMNIROUTE_BASE_URL is set', () => {
  assert.equal(resolveDirectProvider({ OMNIROUTE_BASE_URL: 'http://gw/v1', GEMINI_API_KEY: 'k' }), null)
})

test('no key means no direct provider', () => {
  assert.equal(resolveDirectProvider({}), null)
})

test('Gemini is used by default, Groq when preferred or the only key', () => {
  assert.equal(resolveDirectProvider({ GEMINI_API_KEY: 'g', GROQ_API_KEY: 'q' })?.provider, 'gemini')
  assert.equal(resolveDirectProvider({ GEMINI_API_KEY: 'g', GROQ_API_KEY: 'q', AI_DIRECT_PROVIDER: 'groq' })?.provider, 'groq')
  assert.equal(resolveDirectProvider({ GROQ_API_KEY: 'q' })?.provider, 'groq')
  assert.equal(resolveDirectProvider({ GEMINI_API_KEY: 'g', AI_DIRECT_MODEL_FAST: 'm' })?.models.reasoning, 'm')
})
