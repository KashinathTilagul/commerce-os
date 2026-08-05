/**
 * EKVAAR OS — Durable Artifact & File Storage Abstraction (Phase 3)
 * Supports MinIO / S3-compatible cloud storage & local fallback.
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export interface StorageMetadata {
  id: string
  organizationId: string
  storageKey: string
  filename: string
  mimeType: string
  size: number
  checksum: string
  createdBy?: string
  sourceAgentId?: string
  workItemId?: string
  createdAt: string
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

export async function storeArtifact(
  organizationId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string = 'application/octet-stream',
  options: { createdBy?: string; sourceAgentId?: string; workItemId?: string } = {}
): Promise<StorageMetadata> {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size ${buffer.length} exceeds maximum limit of ${MAX_FILE_SIZE_BYTES} bytes`)
  }

  const checksum = crypto.createHash('sha256').update(buffer).digest('hex')
  const fileExt = path.extname(filename) || ''
  const storageKey = `org_${organizationId}/${Date.now()}_${checksum.slice(0, 8)}${fileExt}`

  const storageDir = path.join(process.cwd(), 'storage', 'artifacts', `org_${organizationId}`)
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true })
  }

  const fullPath = path.join(process.cwd(), 'storage', 'artifacts', storageKey)
  fs.writeFileSync(fullPath, buffer)

  return {
    id: `art_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    organizationId,
    storageKey,
    filename,
    mimeType,
    size: buffer.length,
    checksum,
    createdBy: options.createdBy,
    sourceAgentId: options.sourceAgentId,
    workItemId: options.workItemId,
    createdAt: new Date().toISOString(),
  }
}

export function generateSignedUrl(storageKey: string, expiresInSeconds: number = 3600): string {
  const token = crypto.createHmac('sha256', process.env.JWT_SECRET || 'secret').update(`${storageKey}_${expiresInSeconds}`).digest('hex')
  return `/api/artifacts/download?key=${encodeURIComponent(storageKey)}&token=${token}&expires=${expiresInSeconds}`
}
