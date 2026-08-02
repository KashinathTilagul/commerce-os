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
    scopes: ['ads_read', 'ads_management', 'business_management'],
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
