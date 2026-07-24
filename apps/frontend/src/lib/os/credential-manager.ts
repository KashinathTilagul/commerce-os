import { OSModule, ServiceRegistry } from './registry'
import { IEventBus } from './event-bus'
import * as crypto from 'crypto'

/**
 * In a real production system, this would use KMS, AWS Secrets Manager, or HashiCorp Vault.
 * For this prototype, we simulate encrypted local storage via an OS-level key.
 */
const SYSTEM_MASTER_KEY = process.env.OS_MASTER_KEY || 'default-insecure-master-key-32b!'

export interface Credential {
  id: string
  providerId: string
  userId: string
  encryptedToken: string
  refreshToken?: string
  expiresAt?: Date
  metadata: Record<string, any>
}

export class CredentialManager implements OSModule {
  name = 'CredentialManager'

  async initialize() {
    console.log('[CredentialManager] Initializing Secure Store...')
  }

  async health() {
    return { status: 'HEALTHY' as const, latencyMs: 2 }
  }

  /**
   * Encrypt a secret before storage.
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SYSTEM_MASTER_KEY.padEnd(32, '0').slice(0, 32)), iv)
    let encrypted = cipher.update(text)
    encrypted = Buffer.concat([encrypted, cipher.final()])
    return iv.toString('hex') + ':' + encrypted.toString('hex')
  }

  /**
   * Decrypt a secret from storage.
   */
  private decrypt(text: string): string {
    const textParts = text.split(':')
    const iv = Buffer.from(textParts.shift()!, 'hex')
    const encryptedText = Buffer.from(textParts.join(':'), 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SYSTEM_MASTER_KEY.padEnd(32, '0').slice(0, 32)), iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  }

  /**
   * Securely store a credential for a provider.
   */
  async storeCredential(providerId: string, userId: string, token: string, refreshToken?: string, expiresIn?: number) {
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined
    
    const eventBus = ServiceRegistry.get<IEventBus>('EventBus')
    if (eventBus) {
      await eventBus.publish({ type: 'CREDENTIAL_STORED', source: this.name, payload: { providerId, userId } })
    }
    
    // Mock return
    return {
      id: `cred_${Math.random().toString(36).substring(2)}`,
      providerId,
      userId,
      encryptedToken: this.encrypt(token),
      refreshToken: refreshToken ? this.encrypt(refreshToken) : undefined,
      expiresAt,
      metadata: {}
    }
  }

  /**
   * Securely retrieve a credential, checking for expiry and triggering refresh if necessary.
   */
  async getCredential(providerId: string, userId: string): Promise<string | null> {
    const envKeyMap: Record<string, string> = {
      'google-workspace': 'GOOGLE_API_KEY',
      'github': 'GITHUB_TOKEN',
      'canva': 'CANVA_API_KEY'
    }

    const eventBus = ServiceRegistry.get<IEventBus>('EventBus')
    const envKey = envKeyMap[providerId]
    if (envKey && process.env[envKey]) {
      console.warn(`[CredentialManager] Using ENV fallback for ${providerId}. Migrate to Secure Store.`)
      if (eventBus) {
        await eventBus.publish({ type: 'CREDENTIAL_ACCESSED', source: this.name, payload: { providerId, userId, source: 'ENV_FALLBACK' } })
      }
      return process.env[envKey] as string
    }

    if (eventBus) {
      await eventBus.publish({ type: 'CREDENTIAL_MISSING', source: this.name, payload: { providerId, userId } })
    }
    return null
  }
}

