import { db } from '@/lib/db'
import { decryptSecret, encryptSecret } from '@/lib/crypto'

const DEFAULT_IMAGE_MODEL = 'google/gemini-2.0-flash-exp:image'

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
  const apiKey = decryptSecret(storedKey) || process.env.OMNIROUTE_API_KEY || ''
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
