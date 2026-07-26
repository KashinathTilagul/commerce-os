import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject, generateText } from 'ai'
import type { LanguageModel } from 'ai'
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

function makeModel(c: Candidate): LanguageModel {
  if (c.provider === 'bedrock' || c.provider === 'amazon-bedrock') {
    const br = createAmazonBedrock({ apiKey: c.apiKey, region: process.env.AWS_REGION || 'us-east-1' })
    return br(c.model.replace('amazon-bedrock/', ''))
  }
  // OpenAI-compatible: OpenRouter, Groq, OpenAI, etc.
  const oa = createOpenAI({ name: c.provider, apiKey: c.apiKey, baseURL: c.baseUrl || 'https://openrouter.ai/api/v1' })
  return oa(c.model)
}

// Build the ordered candidate chain for a tier from settings.
async function chainFor(tier: Tier): Promise<Candidate[]> {
  const cfg = await loadSettings()

  // Bedrock guaranteed tail — historically the key is stored in primaryApiKey,
  // else the OPENCODE_API_KEY env. This is the proven-working path today.
  const bedrockKey = dec(cfg.primaryApiKey) || process.env.OPENCODE_API_KEY || ''
  const bedrock: Candidate | null = bedrockKey
    ? { provider: 'bedrock', model: BEDROCK_DEFAULT, apiKey: bedrockKey }
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

// generateObject with tiered fallback. Same options shape as ai/generateObject.
export async function routeObject<T>(
  tier: Tier,
  opts: { schema: any; system: string; prompt: string; temperature?: number; maxOutputTokens?: number },
): Promise<{ object: T; provider: string; model: string }> {
  const { result, provider, model } = await runChain(tier, async (m) => {
    // ponytail: force tool-call mode instead of the default json_schema
    // response format — Groq (and most non-OpenAI OpenAI-compatible
    // providers) only support json_schema on a small model whitelist, so
    // the default mode threw "does not support response_format json_schema"
    // for any other model. Tool-calling structured output works everywhere.
    const { object } = await generateObject({ model: m, mode: 'tool', ...opts })
    return object as T
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
