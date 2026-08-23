export const LLM_PROVIDERS = {
  openrouter: { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', auth: 'bearer' },
  groq: { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', auth: 'bearer' },
  gemini: { label: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', auth: 'bearer' },
  anthropic: { label: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', auth: 'anthropic' },
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', auth: 'bearer' },
  nvidia: { label: 'NVIDIA NIM', baseUrl: 'https://integrate.api.nvidia.com/v1', auth: 'bearer' },
  cohere: { label: 'Cohere', baseUrl: 'https://api.cohere.ai/compatibility/v1', auth: 'bearer' },
  huggingface: { label: 'Hugging Face', baseUrl: 'https://router.huggingface.co/v1', auth: 'bearer' },
  bedrock: { label: 'Amazon Bedrock', baseUrl: 'https://bedrock-mantle.ap-south-1.api.aws/v1', auth: 'bearer' },
} as const

export type LlmProvider = keyof typeof LLM_PROVIDERS

export function isLlmProvider(value: string): value is LlmProvider {
  return value in LLM_PROVIDERS
}

export async function testLlmConnection(provider: LlmProvider, apiKey: string) {
  const definition = LLM_PROVIDERS[provider]
  const headers: Record<string, string> = definition.auth === 'anthropic'
    ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
    : { Authorization: `Bearer ${apiKey}` }
  const response = await fetch(`${definition.baseUrl}/models`, {
    headers,
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`${definition.label} rejected the key (${response.status})`)

  const payload = await response.json()
  const rows = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.models) ? payload.models : []
  const models = rows
    .filter((row: any) => !Array.isArray(row.supportedGenerationMethods) || row.supportedGenerationMethods.includes('generateContent'))
    .map((row: any) => String(row.id || row.name || '').replace(/^models\//, ''))
    .filter((id: string) => id && !/(embedding|whisper|tts|dall-e|image|moderation|rerank|transcri)/i.test(id))
    .sort()
  if (!models.length) throw new Error(`${definition.label} returned no chat models`)
  return { baseUrl: definition.baseUrl, models }
}
