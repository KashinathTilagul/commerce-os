import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { z } from 'zod'

export function storageRoot(): string {
  if (process.env.STORAGE_DIR) return process.env.STORAGE_DIR
  // ponytail: Vercel lambdas can only write /tmp, and the directory dies with the instance.
  // Durable artifacts need object storage (Supabase Storage or S3).
  if (process.env.VERCEL === '1') return path.join(os.tmpdir(), 'commerce-os-storage')
  return path.join(process.cwd(), 'storage')
}

export async function readStoredArtifact(location: string): Promise<Buffer> {
  const root = await fs.realpath(storageRoot())
  const resolved = await fs.realpath(location)
  const relative = path.relative(root, resolved)
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('Artifact path outside storage')
  return fs.readFile(resolved)
}

// ponytail: storage paths are deterministic — single mapping object
const ARTIFACT_DIRS: Record<ArtifactType, string> = { PDF: 'pdf', PNG: 'images', VIDEO: 'videos', AUDIO: 'audio', EXCEL: 'templates' }
const ARTIFACT_EXTS: Record<ArtifactType, string> = { PDF: '.pdf', PNG: '.png', VIDEO: '.mp4', AUDIO: '.mp3', EXCEL: '.xlsx' }
const getStorageDir = (type: ArtifactType) => ARTIFACT_DIRS[type]
const getArtifactExt = (type: ArtifactType) => ARTIFACT_EXTS[type]

export const ArtifactTypeSchema = z.enum(['PDF', 'PNG', 'VIDEO', 'AUDIO', 'EXCEL'])
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>

export interface StorageMetadata {
  id: string
  type: ArtifactType
  filename: string
  path: string
  size: number
  createdAt: Date
}

async function ensureDirectoryExists(dir: string): Promise<void> {
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
}

export async function initializeStorage(): Promise<void> {
  await ensureDirectoryExists(storageRoot())
  await Promise.all(Object.values(ARTIFACT_DIRS).map(dir => ensureDirectoryExists(path.join(storageRoot(), dir))))
}

export async function storeArtifact(
  id: string,
  type: ArtifactType,
  content: Buffer,
  customFilename?: string
): Promise<StorageMetadata> {
  await initializeStorage()
  
  const dir = path.join(storageRoot(), getStorageDir(type))
  // Titles come from LLM output — strip path separators so a name like
  // "slide 2/3" cannot escape the artifact directory.
  const filename = (customFilename || `${id}${getArtifactExt(type)}`).replace(/[/\\]/g, ' ')
  const filepath = path.join(dir, filename)
  
  await fs.writeFile(filepath, content)
  
  const stats = await fs.stat(filepath)
  
  return {
    id,
    type,
    filename,
    path: filepath,
    size: stats.size,
    createdAt: new Date()
  }
}

export async function getArtifact(id: string, type: ArtifactType): Promise<Buffer | null> {
  const filepath = path.join(storageRoot(), getStorageDir(type), `${id}${getArtifactExt(type)}`)
  
  try {
    return await fs.readFile(filepath)
  } catch (error) {
    console.error(`Failed to read artifact ${id}:`, error)
    return null
  }
}

export async function deleteArtifact(id: string, type: ArtifactType): Promise<boolean> {
  const filepath = path.join(storageRoot(), getStorageDir(type), `${id}${getArtifactExt(type)}`)
  
  try {
    await fs.unlink(filepath)
    return true
  } catch {
    return false
  }
}

export async function listArtifacts(type?: ArtifactType): Promise<string[]> {
  await initializeStorage()
  
  if (type) {
    const dir = path.join(storageRoot(), getStorageDir(type))
    const files = await fs.readdir(dir)
    return files.map(f => f.replace(/\.[^.]+$/, ''))
  }
  
  const allFiles: string[] = []
  for (const subdir of Object.values(ARTIFACT_DIRS)) {
    const dir = path.join(storageRoot(), subdir)
    const files = await fs.readdir(dir)
    allFiles.push(...files.map(f => f.replace(/\.[^.]+$/, '')))
  }
  
  return allFiles
}

export function getStoragePath(type: ArtifactType, filename: string): string {
  return path.join(storageRoot(), getStorageDir(type), filename)
}
