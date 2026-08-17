import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { db } from '@/lib/db'
import { decryptSecret } from '@/lib/crypto'

export type Tier = 'fast' | 'default' | 'reasoning'

// ── Model Provider Resolution ───────────────────────────────────────────────

function getBedrockModel(modelId: string, apiKey: string) {
  const region = process.env.AWS_REGION || 'us-east-1'
  const bedrock = createAmazonBedrock({ region, apiKey })
  return bedrock(modelId)
}

function getOpenRouterModel(modelId: string, apiKey: string, baseURL = 'https://openrouter.ai/api/v1') {
  const openrouter = createOpenAI({
    baseURL,
    apiKey,
  })
  return openrouter(modelId)
}

function getGroqModel(modelId: string, apiKey: string, baseURL = 'https://api.groq.com/openai/v1') {
  const groq = createOpenAI({
    baseURL,
    apiKey,
  })
  return groq(modelId)
}

function getOpenAIModel(modelId: string, apiKey: string, baseURL?: string) {
  const openai = createOpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  })
  return openai(modelId)
}

function getOmniRouteModel(modelId: string, apiKey: string, baseURL = process.env.OMNIROUTE_BASE_URL || 'http://omniroute:20128/v1') {
  return createOpenAI({ apiKey, baseURL }).chat(modelId || 'auto')
}

// Model fallback chains per tier
type ModelTarget = { provider: string; model: string; apiKey?: string; baseUrl?: string }

function modelForTarget(target: ModelTarget) {
  const provider = target.provider.toLowerCase()
  if (!target.apiKey) throw new Error(`${target.provider} API key is not configured`)
  if (provider === 'bedrock') return getBedrockModel(target.model, target.apiKey)
  if (provider === 'openrouter') return getOpenRouterModel(target.model, target.apiKey, target.baseUrl)
  if (provider === 'groq') return getGroqModel(target.model, target.apiKey, target.baseUrl)
  if (provider === 'omniroute') return getOmniRouteModel(target.model, target.apiKey || '', target.baseUrl || process.env.OMNIROUTE_BASE_URL || 'http://omniroute:20128/v1')
  return getOpenAIModel(target.model, target.apiKey, target.baseUrl)
}

async function configuredTargets(organizationId: string): Promise<ModelTarget[]> {
  try {
    const settings = await db.systemSetting.findUnique({ where: { organizationId } })
    if (!settings) return []
    // decryptSecret is null/secret-mismatch safe (returns ''), so one bad
    // slot only drops itself — never wipes the org's whole provider chain.
    return [
      { provider: settings.primaryProvider, model: settings.primaryModel, apiKey: decryptSecret(settings.primaryApiKey), baseUrl: settings.primaryBaseUrl },
      { provider: settings.fallback1Provider, model: settings.fallback1Model, apiKey: decryptSecret(settings.fallback1ApiKey), baseUrl: settings.fallback1BaseUrl },
      { provider: settings.fallback2Provider, model: settings.fallback2Model, apiKey: decryptSecret(settings.fallback2ApiKey), baseUrl: settings.fallback2BaseUrl },
    ]
      // OmniRoute accepts an empty model (defaults to 'auto'), so a configured
      // key alone should still make the target usable.
      .filter((target) => target.provider && target.apiKey && (target.model || target.provider.toLowerCase() === 'omniroute'))
      .map((target) => (target.provider.toLowerCase() === 'omniroute' && !target.model ? { ...target, model: 'auto' } : target))
  } catch (error: any) {
    console.warn('[AI Router] Could not load saved routing settings:', error?.message || error)
    return []
  }
}

async function getModelChain(tier: Tier, organizationId: string): Promise<Array<{ provider: string; model: string; instance: any }>> {
  const chain: Array<{ provider: string; model: string; instance: any }> = []

  const saved = await configuredTargets(organizationId)
  for (const target of saved) {
    try { chain.push({ provider: target.provider, model: target.model, instance: modelForTarget(target) }) } catch {}
  }
  if (chain.length === 0) throw new Error('No AI provider is configured for this organization. Add an API key in Settings.')

  return chain
}

// ── Run with Fallback Chain ──────────────────────────────────────────────────

async function runChain<T>(
  tier: Tier,
  organizationId: string,
  fn: (model: any, target: { provider: string; model: string }) => Promise<T>,
): Promise<{ result: T; provider: string; model: string }> {
  const chain = await getModelChain(tier, organizationId)
  let lastError: any = null

  for (const item of chain) {
    try {
      const result = await fn(item.instance, item)
      return { result, provider: item.provider, model: item.model }
    } catch (e: any) {
      console.warn(`[AI Router] Tier '${tier}' provider '${item.provider}' failed:`, e.message)
      lastError = e
    }
  }

  throw lastError || new Error(`All providers in tier '${tier}' failed`)
}

// A saved OmniRoute baseUrl equal to another provider's default is a stale
// leftover from a provider switch (Settings hides the Base URL field for
// OmniRoute) and would send the OmniRoute key to OpenRouter/Groq. Ignore it.
const STALE_OMNIROUTE_URLS = new Set(['https://openrouter.ai/api/v1', 'https://api.groq.com/openai/v1'])

// ponytail: the `omniroute` hostname only resolves inside the compose network;
// on a host dev run the container is published on localhost. Fall back between
// the two on connect errors only — an HTTP answer (even a 401) is a real
// answer. Upgrade path: set OMNIROUTE_BASE_URL explicitly in every environment.
const OMNIROUTE_DEFAULT_URLS = ['http://localhost:20128/v1', 'http://omniroute:20128/v1']

function isConnectError(e: any): boolean {
  const code = e?.cause?.code || e?.code || ''
  return e instanceof TypeError || /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|UND_ERR_CONNECT/.test(String(code))
}

async function generateOmniRouteText(organizationId: string, model: string, opts: { system: string; prompt: string; temperature?: number; maxOutputTokens?: number }) {
  const settings = await db.systemSetting.findUnique({ where: { organizationId } }).catch(() => null)
  const saved = settings?.primaryProvider === 'omniroute' && settings.primaryBaseUrl ? settings.primaryBaseUrl.replace(/\/$/, '') : ''
  const cleanSaved = saved && !STALE_OMNIROUTE_URLS.has(saved) ? saved : ''
  const envUrl = (process.env.OMNIROUTE_BASE_URL || '').replace(/\/$/, '')
  const urls = [...new Set([cleanSaved, envUrl, ...OMNIROUTE_DEFAULT_URLS].filter(Boolean))]
  const apiKey = settings?.primaryProvider === 'omniroute' ? decryptSecret(settings.primaryApiKey) : ''
  let lastError: any = null

  for (const baseUrl of urls) {
    let raw = ''
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, stream: false, temperature: opts.temperature, max_tokens: opts.maxOutputTokens, messages: [{ role: 'system', content: opts.system }, { role: 'user', content: opts.prompt }] }),
        signal: AbortSignal.timeout(180_000),
      })
      raw = await response.text()
      if (!response.ok) { try { throw new Error(JSON.parse(raw)?.error?.message || `OmniRoute returned ${response.status}`) } catch (error) { if (error instanceof SyntaxError) throw new Error(`OmniRoute returned ${response.status}`); throw error } }
    } catch (e: any) {
      if (!isConnectError(e)) throw e
      lastError = e
      console.warn(`[AI Router] OmniRoute unreachable at ${baseUrl}, trying next URL`)
      continue
    }
    try { return JSON.parse(raw)?.choices?.[0]?.message?.content || '' } catch {}
    let text = ''
    for (const line of raw.split(/\r?\n/)) {
      if (!line.startsWith('data:') || line.trim() === 'data: [DONE]') continue
      try { text += JSON.parse(line.slice(5).trim())?.choices?.[0]?.delta?.content || '' } catch {}
    }
    if (!text) throw new Error('OmniRoute returned no text')
    return text
  }

  throw lastError || new Error('OmniRoute is not reachable at any known URL')
}

// Simple JSON Schema generator helper
function toJSONSchema(schema: any): any {
  if (schema._def?.typeName === 'ZodObject') {
    const shape = schema._def.shape()
    const properties: any = {}
    const required: string[] = []

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = toJSONSchema(value)
      if ((value as any)._def?.typeName !== 'ZodOptional') {
        required.push(key)
      }
    }

    return { type: 'object', properties, required }
  }

  if (schema._def?.typeName === 'ZodString') return { type: 'string' }
  if (schema._def?.typeName === 'ZodNumber') return { type: 'number' }
  if (schema._def?.typeName === 'ZodBoolean') return { type: 'boolean' }
  if (schema._def?.typeName === 'ZodArray') return { type: 'array', items: toJSONSchema(schema._def.type) }
  if (schema._def?.typeName === 'ZodEnum') return { type: 'string', enum: schema._def.values }
  if (schema._def?.typeName === 'ZodDiscriminatedUnion') return { type: 'object' }

  return { type: 'string' }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function routeObject<T>(
  tier: Tier,
  organizationId: string,
  opts: { schema: any; system: string; prompt: string; temperature?: number; maxOutputTokens?: number },
): Promise<{ object: T; provider: string; model: string }> {
  const jsonSchema = JSON.stringify(toJSONSchema(opts.schema))
  const { result, provider, model } = await runChain(tier, organizationId, async (m, target) => {
    const request = { system: `${opts.system}\n\nRespond with ONLY a single valid JSON object matching this JSON Schema — no markdown fences or prose:\n${jsonSchema}`, prompt: opts.prompt, temperature: opts.temperature, maxOutputTokens: opts.maxOutputTokens }
    const text = target.provider === 'omniroute' ? await generateOmniRouteText(organizationId, target.model, request) : (await generateText({ model: m, ...request })).text

    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')

    if (start >= 0 && end > start) {
      const jsonText = cleaned.slice(start, end + 1)
      try {
        const parsedJson = JSON.parse(jsonText)
        const validated = opts.schema.safeParse(parsedJson)
        if (validated.success) {
          return validated.data as T
        }
        // Fallback for valid JSON objects that have a spoken string field
        if (parsedJson && typeof parsedJson === 'object' && 'spoken' in parsedJson) {
          return {
            spoken: String(parsedJson.spoken),
            action: parsedJson.action || { type: 'none' },
          } as unknown as T
        }
      } catch {}
    }

    // Fallback: If LLM returned text instead of strict JSON, extract spoken text cleanly
    if (cleaned) {
      const spokenMatch = cleaned.match(/"spoken"\s*:\s*"([^"]+)"/)
      const fallbackText = spokenMatch ? spokenMatch[1] : cleaned.replace(/[{}[\]"]/g, ' ').trim()
      return {
        spoken: fallbackText || 'Understood, Founder.',
        action: { type: 'none' },
      } as unknown as T
    }

    throw new Error('Provider did not return a valid text response')
  })
  return { object: result, provider, model }
}

export async function routeText(
  tier: Tier,
  organizationId: string,
  opts: { system: string; prompt: string; temperature?: number; maxOutputTokens?: number },
): Promise<{ text: string; provider: string; model: string }> {
  const { result, provider, model } = await runChain(tier, organizationId, async (m, target) => {
    return target.provider === 'omniroute' ? generateOmniRouteText(organizationId, target.model, opts) : (await generateText({ model: m, ...opts })).text
  })
  return { text: result, provider, model }
}
