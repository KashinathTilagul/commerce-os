import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { db } from '@/lib/db'
import { decryptSecret } from '@/lib/crypto'
import { resolveDirectProvider } from '@/lib/direct-provider'
import { normalizeOmniRouteBaseUrl } from '@/lib/omniroute-config'

export type Tier = 'fast' | 'default' | 'reasoning'

// Vision-capable model identifiers (OmniRoute & direct model IDs)
const VISION_MODELS = new Set([
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-haiku',
  'anthropic/claude-3-opus',
  'google/gemini-pro-1.5',
  'google/gemini-flash-1.5',
  'google/gemini-2.0-flash-exp',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'auto',
])

function supportsVision(modelId: string): boolean {
  const normalized = modelId.toLowerCase()
  return normalized.startsWith('auto/') ||
    VISION_MODELS.has(normalized) ||
    normalized.includes('vision') ||
    normalized.includes('gpt-4o') ||
    normalized.includes('claude-3') ||
    normalized.includes('gemini') ||
    normalized.includes('claude-3.5') ||
    normalized.includes('claude-3-opus')
}

export const PROVIDER_DEFAULT_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  openrouter: 'https://openrouter.ai/api/v1',
  ollama: 'http://localhost:11434/v1',
  omniroute: process.env.OMNIROUTE_BASE_URL || 'http://localhost:20128/v1',
}

export function validateProviderBaseUrl(provider: string, rawUrl?: string | null): string {
  const trimmed = (rawUrl || '').trim()
  if (!trimmed) return ''
  const normalizedProvider = (provider || '').trim().toLowerCase()
  if (normalizedProvider === 'omniroute') {
    return normalizeOmniRouteBaseUrl(trimmed)
  }
  const url = new URL(trimmed)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Provider base URL must use http or https')
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Provider base URL cannot contain credentials, query or fragment')
  }
  const host = url.hostname.toLowerCase()
  if (host === '169.254.169.254' || host === 'metadata.google.internal' || host.startsWith('169.254.')) {
    throw new Error('Provider base URL cannot target metadata endpoints')
  }
  return url.href.replace(/\/$/, '')
}

async function getOmniRouteConfig(organizationId?: string) {
  try {
    const settings = organizationId
      ? await db.systemSetting.findUnique({ where: { organizationId } })
      : null
    if (!settings) return { apiKey: '', baseUrl: '' }
    const slots = [
      { provider: settings.primaryProvider, apiKey: settings.primaryApiKey, baseUrl: settings.primaryBaseUrl },
      { provider: settings.fallback1Provider, apiKey: settings.fallback1ApiKey, baseUrl: settings.fallback1BaseUrl },
      { provider: settings.fallback2Provider, apiKey: settings.fallback2ApiKey, baseUrl: settings.fallback2BaseUrl },
    ]
    const slot = slots.find((s) => s.provider.toLowerCase() === 'omniroute' && s.apiKey)
      || (!settings.primaryProvider && settings.primaryApiKey ? slots[0] : undefined)
    return {
      apiKey: slot?.apiKey ? decryptSecret(slot.apiKey) : '',
      baseUrl: slot?.baseUrl || '',
    }
  } catch {
    return { apiKey: '', baseUrl: '' }
  }
}

const DEFAULT_OMNIROUTE_BASE_URL = process.env.OMNIROUTE_BASE_URL || 'http://localhost:20128/v1'
const DEFAULT_MODEL_FAST = process.env.OMNIROUTE_MODEL_FAST || 'auto/best-fast'
const DEFAULT_MODEL_REASONING = process.env.OMNIROUTE_MODEL_REASONING || 'auto/best-reasoning'
const DEFAULT_MODEL_VISION = process.env.OMNIROUTE_MODEL_VISION || 'auto/best-vision'

function getOmniRouteModel(modelId: string, apiKey = '', baseURL = '', headers?: Record<string, string>) {
  const resolvedBaseUrl = baseURL || DEFAULT_OMNIROUTE_BASE_URL
  const omniroute = createOpenAI({
    baseURL: resolvedBaseUrl,
    apiKey,
    headers,
  })
  return omniroute.chat(modelId)
}

export type ModelTarget = { provider: string; model: string; apiKey?: string; baseUrl?: string }
export type SavedRoutingSettings = {
  primaryProvider: string
  primaryModel: string
  primaryApiKey: string
  primaryBaseUrl: string
  fallback1Provider: string
  fallback1Model: string
  fallback1ApiKey: string
  fallback1BaseUrl: string
  fallback2Provider: string
  fallback2Model: string
  fallback2ApiKey: string
  fallback2BaseUrl: string
}

export function resolveTargetConfig(target: ModelTarget) {
  const provider = (target.provider || '').trim().toLowerCase()
  const baseUrl = target.baseUrl?.trim() || PROVIDER_DEFAULT_BASE_URLS[provider] || DEFAULT_OMNIROUTE_BASE_URL
  return { provider, model: target.model.trim(), baseUrl }
}

export function modelForTarget(target: ModelTarget) {
  const { provider, model, baseUrl } = resolveTargetConfig(target)
  if (provider === 'anthropic' && target.apiKey) {
    return createAnthropic({
      apiKey: target.apiKey,
      ...(target.baseUrl?.trim() ? { baseURL: target.baseUrl.trim() } : {}),
    })(model)
  }
  if (provider === 'openai') {
    return createOpenAI({
      apiKey: target.apiKey,
      baseURL: baseUrl,
    })(model)
  }
  // OpenAI-compatible gateways (OmniRoute, Groq, Gemini OpenAI compat, OpenRouter, Ollama)
  return createOpenAI({
    apiKey: target.apiKey || (provider === 'ollama' ? 'ollama' : ''),
    baseURL: baseUrl,
  }).chat(model)
}

async function configuredTargets(organizationId?: string, preloaded?: SavedRoutingSettings | null): Promise<ModelTarget[]> {
  try {
    const settings = preloaded || (organizationId
      ? await db.systemSetting.findUnique({ where: { organizationId } })
      : null)
    if (!settings) return []
    return [
      { provider: settings.primaryProvider, model: settings.primaryModel, apiKey: decryptSecret(settings.primaryApiKey), baseUrl: settings.primaryBaseUrl },
      { provider: settings.fallback1Provider, model: settings.fallback1Model, apiKey: decryptSecret(settings.fallback1ApiKey), baseUrl: settings.fallback1BaseUrl },
      { provider: settings.fallback2Provider, model: settings.fallback2Model, apiKey: decryptSecret(settings.fallback2ApiKey), baseUrl: settings.fallback2BaseUrl },
    ].filter((target) => {
      if (!target.provider || !target.model) return false
      return target.provider.toLowerCase() === 'ollama' || Boolean(target.apiKey)
    })
  } catch (error: any) {
    console.warn('[AI Router] Could not load saved routing settings:', error?.message || error)
    return []
  }
}

async function getModelChain(tier: Tier, needsVision?: boolean, organizationId?: string, routingSettings?: SavedRoutingSettings | null): Promise<Array<{ provider: string; model: string; instance: any }>> {
  const chain: Array<{ provider: string; model: string; instance: any }> = []

  const saved = await configuredTargets(organizationId, routingSettings)
  for (const target of saved) {
    try { chain.push({ provider: target.provider, model: target.model, instance: modelForTarget(target) }) } catch {}
  }
  if (chain.length > 0) {
    if (needsVision) {
      const visionModels = chain.filter(c => supportsVision(c.model))
      if (visionModels.length > 0) return visionModels
    }
    return chain
  }

  // OmniRoute fallback chain only
  const omnirouteConfig = await getOmniRouteConfig(organizationId)
  if (omnirouteConfig.apiKey) {
    const model = needsVision
      ? DEFAULT_MODEL_VISION
      : tier === 'fast' ? DEFAULT_MODEL_FAST : DEFAULT_MODEL_REASONING
    try { chain.push({ provider: 'omniroute', model, instance: getOmniRouteModel(model, omnirouteConfig.apiKey, omnirouteConfig.baseUrl) }) } catch {}
  }

  // No gateway deployed: call one provider directly with a server env key.
  if (chain.length === 0) {
    const direct = resolveDirectProvider()
    if (direct) {
      const model = needsVision ? direct.models.vision : tier === 'fast' ? direct.models.fast : direct.models.reasoning
      try {
        const client = createOpenAI({ baseURL: direct.baseUrl, apiKey: direct.apiKey })
        chain.push({ provider: direct.provider, model, instance: client.chat(model) })
      } catch {}
    }
  }

  if (chain.length === 0) {
    throw new Error('No organization-owned AI provider is configured')
  }

  return chain
}

async function runChain<T>(
  tier: Tier,
  fn: (model: any) => Promise<T>,
  needsVision?: boolean,
  organizationId?: string,
  routingSettings?: SavedRoutingSettings | null,
): Promise<{ result: T; provider: string; model: string }> {
  const chain = await getModelChain(tier, needsVision, organizationId, routingSettings)
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

export async function runVisionChain<T>(
  tier: Tier,
  fn: (model: any) => Promise<T>,
  organizationId?: string
): Promise<{ result: T; provider: string; model: string }> {
  return runChain(tier, fn, true, organizationId)
}

export function toJSONSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const generated = z.toJSONSchema(schema, { unrepresentable: 'any' }) as Record<string, unknown>
  const { $schema: _ignored, ...rest } = generated
  return rest
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function routeObject<T>(
  tier: Tier,
  organizationId: string,
  opts: { schema: z.ZodTypeAny; system: string; prompt: string; temperature?: number; maxOutputTokens?: number; routingSettings?: SavedRoutingSettings | null },
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
      } catch {}
    }

    throw new Error('Provider response did not match the required schema')
  }, false, organizationId, opts.routingSettings)
  return { object: result, provider, model }
}

export async function routeText(
  tier: Tier,
  organizationId: string,
  opts: { system: string; prompt: string; temperature?: number; maxOutputTokens?: number; routingSettings?: SavedRoutingSettings | null },
): Promise<{ text: string; provider: string; model: string }> {
  const { routingSettings, ...generationOpts } = opts
  const { result, provider, model } = await runChain(tier, async (m) => {
    const { text } = await generateText({ model: m, ...generationOpts })
    return text
  }, false, organizationId, routingSettings)
  return { text: result, provider, model }
}
