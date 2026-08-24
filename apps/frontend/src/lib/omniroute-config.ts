import { db } from '@/lib/db'
import { decryptSecret, encryptSecret } from '@/lib/crypto'

const DEFAULT_IMAGE_MODEL = ''

export type OmniRouteImageModel = {
  id: string
  name: string
  sizes: string[]
}

export function readOmniRouteImageModels(payload: any): OmniRouteImageModel[] {
  const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.models) ? payload.models : []
  return rows
    .map((model: any) => {
      const id = typeof model === 'string' ? model : model?.id
      if (!id) return null
      return {
        id,
        name: typeof model?.name === 'string' ? model.name : id,
        sizes: Array.isArray(model?.sizes) ? model.sizes.filter((size: unknown) => typeof size === 'string') : [],
      }
    })
    .filter((model: OmniRouteImageModel | null): model is OmniRouteImageModel => Boolean(model))
}

export function normalizeOmniRouteBaseUrl(value?: string) {
  const fallback = process.env.OMNIROUTE_BASE_URL || 'http://omniroute:20128/v1'
  const candidate = value?.trim() || fallback
  const url = new URL(candidate)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('OmniRoute URL must use http or https')
  if (process.env.NODE_ENV === 'production' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    return fallback.replace(/\/$/, '')
  }
  return candidate.replace(/\/$/, '')
}

export async function getOmniRouteConfig(organizationId: string) {
  const settings = await db.systemSetting.findUnique({ where: { organizationId } })
  const storedKey = settings?.primaryApiKey || ''
  const apiKey = decryptSecret(storedKey) || ''
  return {
    baseUrl: normalizeOmniRouteBaseUrl(settings?.primaryBaseUrl),
    apiKey,
    hasApiKey: Boolean(apiKey),
    imageModel: settings?.omnirouteImageModel || DEFAULT_IMAGE_MODEL,
  }
}

export async function saveOmniRouteConfig(
  organizationId: string,
  updates: { baseUrl?: string; apiKey?: string; imageModel?: string },
) {
  const data: Record<string, string> = {}
  if (updates.baseUrl !== undefined) data.primaryBaseUrl = normalizeOmniRouteBaseUrl(updates.baseUrl)
  if (updates.apiKey?.trim()) data.primaryApiKey = encryptSecret(updates.apiKey.trim())
  if (updates.imageModel !== undefined) data.omnirouteImageModel = updates.imageModel.trim()
  if (!Object.keys(data).length) throw new Error('No fields to update')

  return db.systemSetting.upsert({
    where: { organizationId },
    update: data,
    create: { organizationId, ...data },
  })
}

export async function fetchOmniRouteModels(baseUrl: string, apiKey: string, timeout = 4_000) {
  return fetch(`${normalizeOmniRouteBaseUrl(baseUrl)}/models`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    signal: AbortSignal.timeout(timeout),
    cache: 'no-store',
  })
}

export async function fetchOmniRouteImageModels(baseUrl: string, apiKey: string, timeout = 4_000) {
  const normalized = normalizeOmniRouteBaseUrl(baseUrl)
  const paths = ['/models/image', '/images/generations']
  const results = await Promise.all(paths.map(async (path) => {
    try {
      const response = await fetch(`${normalized}${path}`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        signal: AbortSignal.timeout(timeout),
        cache: 'no-store',
      })
      if (!response.ok) {
        return { path, models: [] as OmniRouteImageModel[], error: `returned ${response.status}` }
      }
      const models = readOmniRouteImageModels(await response.json())
      return {
        path,
        models,
        error: models.length ? '' : 'returned no connected image models',
      }
    } catch (error: any) {
      return { path, models: [] as OmniRouteImageModel[], error: error?.message || 'unavailable' }
    }
  }))

  const models = results.flatMap((result) => result.models)
  if (models.length > 0) {
    return Array.from(new Map(models.map((model) => [model.id, model])).values())
  }

  const details = results.map((result) => `${result.path} ${result.error}`).join('; ')
  throw new Error(`OmniRoute returned no connected image models (${details})`)
}
