import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { db } from '@/lib/db'
import { decryptSecret } from '@/lib/crypto'

export type Tier = 'fast' | 'default' | 'reasoning'

// ── Model Provider Resolution ───────────────────────────────────────────────

function getBedrockModel(modelId: string, apiKey?: string) {
  const region = process.env.AWS_REGION || 'us-east-1'
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.AWS_BEARER_TOKEN_BEDROCK || apiKey
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || ''

  const bedrock = createAmazonBedrock({
    region,
    ...(accessKeyId ? { accessKeyId, secretAccessKey } : {}),
  })
  return bedrock(modelId)
}

function getOpenRouterModel(modelId: string, apiKey = process.env.OPENROUTER_API_KEY || '', baseURL = 'https://openrouter.ai/api/v1') {
  const openrouter = createOpenAI({
    baseURL,
    apiKey,
  })
  return openrouter(modelId)
}

function getGroqModel(modelId: string, apiKey = process.env.GROQ_API_KEY || '', baseURL = 'https://api.groq.com/openai/v1') {
  const groq = createOpenAI({
    baseURL,
    apiKey,
  })
  return groq(modelId)
}

function getOpenAIModel(modelId: string, apiKey = process.env.OPENAI_API_KEY || '', baseURL?: string) {
  const openai = createOpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  })
  return openai(modelId)
}

// Model fallback chains per tier
type ModelTarget = { provider: string; model: string; apiKey?: string; baseUrl?: string }

function modelForTarget(target: ModelTarget) {
  const provider = target.provider.toLowerCase()
  if (provider === 'bedrock') return getBedrockModel(target.model, target.apiKey)
  if (provider === 'openrouter') return getOpenRouterModel(target.model, target.apiKey, target.baseUrl)
  if (provider === 'groq') return getGroqModel(target.model, target.apiKey, target.baseUrl)
  if (provider === 'omniroute') return getOpenAIModel(target.model || 'auto', target.apiKey || 'ekvaar-internal', target.baseUrl || process.env.OMNIROUTE_BASE_URL || 'http://omniroute:20128/v1')
  return getOpenAIModel(target.model, target.apiKey, target.baseUrl)
}

async function configuredTargets(): Promise<ModelTarget[]> {
  try {
    const settings = await db.systemSetting.findUnique({ where: { id: 'global' } })
    if (!settings) return []
    return [
      { provider: settings.primaryProvider, model: settings.primaryModel, apiKey: decryptSecret(settings.primaryApiKey), baseUrl: settings.primaryBaseUrl },
      { provider: settings.fallback1Provider, model: settings.fallback1Model, apiKey: decryptSecret(settings.fallback1ApiKey), baseUrl: settings.fallback1BaseUrl },
      { provider: settings.fallback2Provider, model: settings.fallback2Model, apiKey: decryptSecret(settings.fallback2ApiKey), baseUrl: settings.fallback2BaseUrl },
    ].filter((target) => target.provider && target.model && (target.apiKey || target.provider === 'omniroute' || target.provider === 'bedrock'))
  } catch (error: any) {
    console.warn('[AI Router] Could not load saved routing settings:', error?.message || error)
    return []
  }
}

async function getModelChain(tier: Tier): Promise<Array<{ provider: string; model: string; instance: any }>> {
  const chain: Array<{ provider: string; model: string; instance: any }> = []

  const saved = await configuredTargets()
  for (const target of saved) {
    try { chain.push({ provider: target.provider, model: target.model, instance: modelForTarget(target) }) } catch {}
  }
  if (chain.length > 0) return chain

  // 1. Bedrock (Primary if AWS credentials set)
  const bedrockModelId = process.env.BEDROCK_MODEL_ID || 'amazon.nova-pro-v1:0'
  if (process.env.AWS_BEARER_TOKEN_BEDROCK || process.env.AWS_ACCESS_KEY_ID) {
    try { chain.push({ provider: 'bedrock', model: bedrockModelId, instance: getBedrockModel(bedrockModelId) }) } catch {}
  }

  // 2. OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    const model = tier === 'fast' ? 'meta-llama/llama-3.3-70b-instruct' : 'anthropic/claude-3.5-sonnet'
    try { chain.push({ provider: 'openrouter', model, instance: getOpenRouterModel(model) }) } catch {}
  }

  // 3. Groq
  if (process.env.GROQ_API_KEY) {
    const model = tier === 'fast' ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile'
    try { chain.push({ provider: 'groq', model, instance: getGroqModel(model) }) } catch {}
  }

  // 4. OpenAI
  if (process.env.OPENAI_API_KEY) {
    const model = tier === 'fast' ? 'gpt-4o-mini' : 'gpt-4o'
    try { chain.push({ provider: 'openai', model, instance: getOpenAIModel(model) }) } catch {}
  }

  // Fallback default if no env keys are provided
  if (chain.length === 0) {
    const defaultModel = 'meta-llama/llama-3.3-70b-instruct'
    chain.push({ provider: 'openrouter', model: defaultModel, instance: getOpenRouterModel(defaultModel) })
  }

  return chain
}

// ── Run with Fallback Chain ──────────────────────────────────────────────────

async function runChain<T>(
  tier: Tier,
  fn: (model: any) => Promise<T>,
): Promise<{ result: T; provider: string; model: string }> {
  const chain = await getModelChain(tier)
  let lastError: any = null

  for (const item of chain) {
    try {
      const result = await fn(item.instance)
      return { result, provider: item.provider, model: item.model }
    } catch (e: any) {
      console.warn(`[AI Router] Tier '${tier}' provider '${item.provider}' failed:`, e.message)
      lastError = e
    }
  }

  throw lastError || new Error(`All providers in tier '${tier}' failed`)
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
  opts: { schema: any; system: string; prompt: string; temperature?: number; maxOutputTokens?: number },
): Promise<{ object: T; provider: string; model: string }> {
  const jsonSchema = JSON.stringify(toJSONSchema(opts.schema))
  const { result, provider, model } = await runChain(tier, async (m) => {
    const { text } = await generateText({
      model: m,
      system: `${opts.system}\n\nRespond with ONLY a single valid JSON object matching this JSON Schema — no markdown fences or prose:\n${jsonSchema}`,
      prompt: opts.prompt,
      temperature: opts.temperature,
      maxOutputTokens: opts.maxOutputTokens,
    })

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
  opts: { system: string; prompt: string; temperature?: number; maxOutputTokens?: number },
): Promise<{ text: string; provider: string; model: string }> {
  const { result, provider, model } = await runChain(tier, async (m) => {
    const { text } = await generateText({ model: m, ...opts })
    return text
  })
  return { text: result, provider, model }
}
