import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import type { LanguageModel } from 'ai'
import { toJSONSchema } from 'zod'
import { db } from './db'
import { decryptSecret } from './crypto'

// ── Tiered multi-provider AI router ──────────────────────────────────────────
// Bedrock + OpenRouter (and any OpenAI-compatible provider) behind one call.
// Each tier is an ordered fallback chain; we try candidates in order and move
// to the next on any error, so a flaky/underperforming provider never takes the
// whole request down. Config comes from SystemSetting (primary + 2 fallbacks);
// Bedrock is always appended as a guaranteed tail using the key stored today.
//
// ponytail: compression (Caveman/Headroom) is a deliberate phase-2 follow-up.

export type Tier = 'reasoning' | 'default' | 'fast'

interface Candidate {
  provider: string // 'bedrock' | 'openrouter' | 'groq' | 'openai' | ...
  model: string
  apiKey: string
  baseUrl?: string
}

const BEDROCK_DEFAULT = process.env.BEDROCK_MODEL_ID?.replace('amazon-bedrock/', '') || 'zai.glm-5'

let cached: { at: number; cfg: any } | null = null
async function loadSettings(): Promise<any> {
  // 30s cache — chat is bursty; avoids a DB read per turn
  if (cached && Date.now() - cached.at < 30_000) return cached.cfg
  let cfg: any = {}
  try { cfg = (await db.systemSetting.findUnique({ where: { id: 'global' } })) || {} } catch {}
  cached = { at: Date.now(), cfg }
  return cfg
}

function dec(v?: string | null): string {
  try { return decryptSecret(v) } catch { return '' }
}

// Known OpenAI-compatible providers' default base URLs, so picking a provider
// in Settings works without also having to know/paste its API base URL.
const PROVIDER_BASE_URLS: Record<string, string> = {
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
}

function makeModel(c: Candidate): LanguageModel {
  if (c.provider === 'bedrock' || c.provider === 'amazon-bedrock') {
    const br = createAmazonBedrock({ apiKey: c.apiKey, region: process.env.AWS_REGION || 'us-east-1' })
    return br(c.model.replace('amazon-bedrock/', ''))
  }
  // OpenAI-compatible: OpenRouter, Groq, OpenAI, custom, etc.
  const oa = createOpenAI({ name: c.provider, apiKey: c.apiKey, baseURL: c.baseUrl || PROVIDER_BASE_URLS[c.provider] || 'https://openrouter.ai/api/v1' })
  return oa(c.model)
}

// Build the ordered candidate chain for a tier from settings.
async function chainFor(tier: Tier): Promise<Candidate[]> {
  const cfg = await loadSettings()

  const bedrockSlot = [
    { provider: cfg.primaryProvider, model: cfg.primaryModel, key: cfg.primaryApiKey },
    { provider: cfg.fallback1Provider, model: cfg.fallback1Model, key: cfg.fallback1ApiKey },
    { provider: cfg.fallback2Provider, model: cfg.fallback2Model, key: cfg.fallback2ApiKey },
  ].find((candidate) => candidate.provider === 'bedrock' || candidate.provider === 'amazon-bedrock')
  const bedrockKey = process.env.AWS_BEARER_TOKEN_BEDROCK || dec(bedrockSlot?.key) || ''
  const bedrock: Candidate | null = bedrockKey
    ? { provider: 'bedrock', model: bedrockSlot?.model || BEDROCK_DEFAULT, apiKey: bedrockKey }
    : null

  // OpenAI-compatible candidates from the fallback config slots (only if they
  // carry their own key — we never send the Bedrock key to OpenRouter).
  const slot = (prov?: string, model?: string, key?: string, url?: string): Candidate | null => {
    const k = dec(key)
    if (!prov || !model || !k) return null
    if (prov === 'bedrock') return null // bedrock handled above
    return { provider: prov, model, apiKey: k, baseUrl: url }
  }
  const primary = cfg.primaryProvider === 'bedrock' ? null
    : slot(cfg.primaryProvider, cfg.primaryModel, cfg.primaryApiKey, cfg.primaryBaseUrl)
  const fb1 = slot(cfg.fallback1Provider, cfg.fallback1Model, cfg.fallback1ApiKey, cfg.fallback1BaseUrl)
  const fb2 = slot(cfg.fallback2Provider, cfg.fallback2Model, cfg.fallback2ApiKey, cfg.fallback2BaseUrl)

  // Env-injected keys (the deploy already sets these) — used when Settings has
  // no explicit OpenRouter/Groq config, so routing works out of the box.
  const envOpenRouter: Candidate | null = process.env.OPENROUTER_API_KEY
    ? { provider: 'openrouter', model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet', apiKey: process.env.OPENROUTER_API_KEY, baseUrl: 'https://openrouter.ai/api/v1' }
    : null
  const envGroq: Candidate | null = process.env.GROQ_API_KEY
    ? { provider: 'groq', model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', apiKey: process.env.GROQ_API_KEY, baseUrl: 'https://api.groq.com/openai/v1' }
    : null

  const openRouterFirst = [primary, fb1, fb2, envOpenRouter, envGroq].filter(Boolean) as Candidate[]

  // Tier ordering:
  //  reasoning → Bedrock (proven quality) first, then configured providers
  //  default   → configured (cheaper/free) first, Bedrock as safety
  //  fast      → configured cheap/free first, Bedrock as safety
  let chain: Candidate[]
  if (tier === 'reasoning') {
    chain = [bedrock, ...openRouterFirst].filter(Boolean) as Candidate[]
  } else {
    chain = [...openRouterFirst, bedrock].filter(Boolean) as Candidate[]
  }

  // Dedupe by provider+model, keep first occurrence
  const seen = new Set<string>()
  chain = chain.filter(c => {
    const k = `${c.provider}:${c.model}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  if (chain.length === 0) throw new Error('No AI provider configured. Add a Bedrock or OpenRouter key in Settings.')
  return chain
}

async function runChain<T>(
  tier: Tier,
  attempt: (model: LanguageModel) => Promise<T>,
): Promise<{ result: T; provider: string; model: string }> {
  const chain = await chainFor(tier)
  let lastErr: any
  for (const c of chain) {
    try {
      const result = await attempt(makeModel(c))
      if (c !== chain[0]) console.log(`[ai-router] ${tier}: fell back to ${c.provider}/${c.model}`)
      return { result, provider: c.provider, model: c.model }
    } catch (e: any) {
      lastErr = e
      console.error(`[ai-router] ${tier}: ${c.provider}/${c.model} failed — ${e?.message}`)
    }
  }
  throw lastErr || new Error('All AI providers failed')
}

// Structured output with tiered fallback. Same options shape generateObject
// used to take (opts.schema is a zod schema).
//
// ponytail: AI SDK v7's generateObject always requests response_format
// json_schema whenever a schema is given, and most OpenAI-compatible
// providers (Groq included) only support json_schema on a small model
// whitelist — there's no SDK toggle to opt out anymore. Asking for JSON in
// the prompt and validating with the schema ourselves works on every
// provider, so this sidesteps the negotiation entirely instead of chasing
// per-provider structured-output support.
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
    if (start < 0 || end < start) throw new Error('Provider did not return the required JSON object')
    const jsonText = cleaned.slice(start, end + 1)
    return opts.schema.parse(JSON.parse(jsonText)) as T
  })
  return { object: result, provider, model }
}

// generateText with tiered fallback.
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
