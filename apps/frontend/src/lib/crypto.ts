import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

// Encrypts secrets (API keys) before they hit the DB. Key is derived from
// JWT_SECRET (already a required deploy secret) so no new env var is needed.
const PREFIX = 'enc:v1:'
const ALGO = 'aes-256-gcm'
let cachedKey: { secret: string; key: Buffer } | undefined

function getKey(): Buffer {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is required to encrypt/decrypt stored secrets')
  if (cachedKey?.secret !== secret) cachedKey = { secret, key: scryptSync(secret, 'ekvaar-settings-encryption', 32) }
  return cachedKey.key
}

export function encryptSecret(plain: string): string {
  if (!plain) return plain
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64')
}

// Backward-compatible: values saved before encryption was added have no
// prefix and are returned as-is, so existing keys keep working without a
// migration step. New saves always get encrypted.
export function decryptSecret(stored: string | null | undefined): string {
  if (!stored) return ''
  if (!stored.startsWith(PREFIX)) return stored
  // Never throws: a value encrypted under a different JWT_SECRET (shared DB
  // across environments) degrades to "no key" instead of crashing callers.
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), 'base64')
    const iv = raw.subarray(0, 12)
    const tag = raw.subarray(12, 28)
    const ciphertext = raw.subarray(28)
    const decipher = createDecipheriv(ALGO, getKey(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch {
    return ''
  }
}
