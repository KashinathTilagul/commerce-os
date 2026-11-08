// Direct provider fallback: when no OmniRoute gateway is deployed
// (OMNIROUTE_BASE_URL unset), call one provider's OpenAI-compatible API
// with a server env key. OmniRoute stays the default whenever it is set.

export type DirectProviderConfig = {
  provider: 'gemini' | 'groq'
  baseUrl: string
  apiKey: string
  models: { fast: string; reasoning: string; vision: string }
}

type Env = Record<string, string | undefined>

export function resolveDirectProvider(env: Env = process.env): DirectProviderConfig | null {
  if (env.OMNIROUTE_BASE_URL) return null
  const preferred = (env.AI_DIRECT_PROVIDER || '').toLowerCase()
  const gemini = env.GEMINI_API_KEY
  const groq = env.GROQ_API_KEY
  const pick = preferred === 'groq' ? (groq ? 'groq' : gemini ? 'gemini' : null)
    : gemini ? 'gemini' : groq ? 'groq' : null
  if (pick === 'gemini') {
    const fast = env.AI_DIRECT_MODEL_FAST || 'gemini-2.5-flash'
    return {
      provider: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: gemini!,
      models: { fast, reasoning: env.AI_DIRECT_MODEL_REASONING || fast, vision: env.AI_DIRECT_MODEL_VISION || fast },
    }
  }
  if (pick === 'groq') {
    return {
      provider: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: groq!,
      models: {
        fast: env.AI_DIRECT_MODEL_FAST || 'llama-3.1-8b-instant',
        reasoning: env.AI_DIRECT_MODEL_REASONING || 'llama-3.3-70b-versatile',
        vision: env.AI_DIRECT_MODEL_VISION || 'meta-llama/llama-4-scout-17b-16e-instruct',
      },
    }
  }
  return null
}
