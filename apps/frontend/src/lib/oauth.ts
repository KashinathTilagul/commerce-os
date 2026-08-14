import { db } from '@/lib/db'
import crypto from 'crypto'

const OAUTH_PROVIDERS = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/adwords'],
  },
  meta: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: ['business_management', 'pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish'],
  },
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['openid', 'profile', 'email', 'w_member_social'],
  },
  threads: {
    authUrl: 'https://threads.net/oauth/authorize',
    tokenUrl: 'https://graph.threads.net/oauth/access_token',
    scopes: ['threads_basic', 'threads_content_publish'],
  },
  shopify: {
    authUrl: 'https://{shop}.myshopify.com/admin/oauth/authorize',
    tokenUrl: 'https://{shop}.myshopify.com/admin/oauth/access_token',
    scopes: [
      'read_products',
      'write_products',
      'read_inventory',
      'write_inventory',
      'read_orders',
      'read_all_orders',
      'write_orders',
      'read_customers',
      'read_reports',
      'read_themes',
      'write_themes',
    ],
  },
} as const

export type OAuthProvider = keyof typeof OAUTH_PROVIDERS

export function createOAuthState(provider: string, organizationId: string) {
  const payload = Buffer.from(JSON.stringify({ provider, organizationId, issuedAt: Date.now() })).toString('base64url')
  const signature = crypto.createHmac('sha256', getEncryptionKey()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function parseOAuthState(state: string) {
  const [payload, signature] = state.split('.')
  const expected = crypto.createHmac('sha256', getEncryptionKey()).update(payload || '').digest('base64url')
  if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Invalid OAuth state')
  const value = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { provider: string; organizationId: string; issuedAt: number }
  if (!value.issuedAt || Date.now() - value.issuedAt > 15 * 60 * 1000) throw new Error('Expired OAuth state')
  return value
}

function getEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET || 'default-ekvaar-secret-key-at-least-32-chars'
  return crypto.createHash('sha256').update(secret).digest()
}

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

export function decryptToken(ciphertext: string): string {
  try {
    const key = getEncryptionKey()
    const parts = ciphertext.split(':')
    if (parts.length !== 3) return ciphertext // fallback if unencrypted
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encryptedText = parts[2]
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (e) {
    console.error('Failed to decrypt token:', e)
    return ciphertext
  }
}

export async function storeOAuthToken(
  organizationId: string,
  provider: string,
  data: {
    accessToken: string
    refreshToken?: string
    scope?: string
    expiresAt?: Date
    accountId?: string
    accountName?: string
    shopDomain?: string
  }
) {
  const encryptedAccess = encryptToken(data.accessToken)
  const encryptedRefresh = data.refreshToken ? encryptToken(data.refreshToken) : null

  return db.oAuthToken.upsert({
    where: { organizationId_provider: { organizationId, provider } },
    update: {
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      scope: data.scope || '',
      expiresAt: data.expiresAt || null,
      accountId: data.accountId || null,
      accountName: data.accountName || null,
      shopDomain: data.shopDomain || null,
      isValid: true,
    },
    create: {
      organizationId,
      provider,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      scope: data.scope || '',
      expiresAt: data.expiresAt || null,
      accountId: data.accountId || null,
      accountName: data.accountName || null,
      shopDomain: data.shopDomain || null,
      isValid: true,
    },
  })
}

export async function finalizeOAuthConnection(organizationId: string, provider: string, data: { access_token: string; refresh_token?: string; scope?: string; expires_in?: number }, shopDomain?: string) {
  const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined
  if (provider === 'meta') {
    const version = process.env.META_GRAPH_VERSION || 'v25.0'
    const response = await fetch(`https://graph.facebook.com/${version}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(data.access_token)}`)
    const payload = await response.json()
    if (!response.ok) throw new Error(payload?.error?.message || 'Unable to read connected Facebook Pages')
    const pages = Array.isArray(payload.data) ? payload.data : []
    const page = pages.find((item: any) => /ekvaar/i.test(item.name || '')) || (pages.length === 1 ? pages[0] : null)
    if (!page) throw new Error('No unambiguous Ekvaar Facebook Page was found; rename/select the Page and reconnect')
    await storeOAuthToken(organizationId, 'meta', { accessToken: page.access_token, scope: data.scope, expiresAt, accountId: page.id, accountName: page.name })
    if (page.instagram_business_account?.id) await storeOAuthToken(organizationId, 'instagram', { accessToken: page.access_token, scope: data.scope, expiresAt, accountId: page.instagram_business_account.id, accountName: page.instagram_business_account.username || `${page.name} Instagram` })
    return
  }
  if (provider === 'linkedin') {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${data.access_token}` } })
    const profile = await response.json()
    if (!response.ok) throw new Error(profile?.message || 'Unable to read LinkedIn profile')
    await storeOAuthToken(organizationId, provider, { accessToken: data.access_token, refreshToken: data.refresh_token, scope: data.scope, expiresAt, accountId: `urn:li:person:${profile.sub}`, accountName: profile.name || profile.email })
    return
  }
  if (provider === 'threads') {
    const response = await fetch(`https://graph.threads.net/${process.env.META_GRAPH_VERSION || 'v25.0'}/me?fields=id,username&access_token=${encodeURIComponent(data.access_token)}`)
    const profile = await response.json()
    if (!response.ok) throw new Error(profile?.error?.message || 'Unable to read Threads profile')
    await storeOAuthToken(organizationId, provider, { accessToken: data.access_token, refreshToken: data.refresh_token, scope: data.scope, expiresAt, accountId: profile.id, accountName: profile.username })
    return
  }
  await storeOAuthToken(organizationId, provider, { accessToken: data.access_token, refreshToken: data.refresh_token, scope: data.scope, expiresAt, shopDomain })
}

export async function listOAuthConnections(organizationId: string) {
  return db.oAuthToken.findMany({ where: { organizationId, isValid: true }, select: { provider: true, accountId: true, accountName: true, scope: true, expiresAt: true, updatedAt: true } })
}

export async function getOAuthToken(organizationId: string, provider: string) {
  const token = await db.oAuthToken.findUnique({
    where: { organizationId_provider: { organizationId, provider } },
  })

  if (!token || !token.isValid) return null

  return {
    ...token,
    accessToken: decryptToken(token.accessToken),
    refreshToken: token.refreshToken ? decryptToken(token.refreshToken) : null,
  }
}

export async function revokeOAuthToken(organizationId: string, provider: string) {
  return db.oAuthToken.delete({
    where: { organizationId_provider: { organizationId, provider } },
  })
}

export async function isTokenValid(organizationId: string, provider: string): Promise<boolean> {
  const token = await db.oAuthToken.findUnique({
    where: { organizationId_provider: { organizationId, provider } },
  })
  if (!token || !token.isValid) return false
  if (token.expiresAt && token.expiresAt < new Date()) return false
  return true
}

export function getProviderConfig(provider: string) {
  return OAUTH_PROVIDERS[provider as OAuthProvider] || null
}
