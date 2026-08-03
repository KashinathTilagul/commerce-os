// Local Storage Manager - File storage for artifacts
import { promises as fs } from 'fs'
import path from 'path'
import { z } from 'zod'

const STORAGE_ROOT = path.join(process.cwd(), 'storage')

export const ArtifactTypeSchema = z.enum(['PDF', 'PNG', 'VIDEO', 'EXCEL'])
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
  await ensureDirectoryExists(STORAGE_ROOT)
  await ensureDirectoryExists(path.join(STORAGE_ROOT, 'pdf'))
  await ensureDirectoryExists(path.join(STORAGE_ROOT, 'images'))
  await ensureDirectoryExists(path.join(STORAGE_ROOT, 'videos'))
  await ensureDirectoryExists(path.join(STORAGE_ROOT, 'templates'))
}

export async function storeArtifact(
  id: string,
  type: ArtifactType,
  content: Buffer,
  customFilename?: string
): Promise<StorageMetadata> {
  await initializeStorage()
  
  const subdir = type === 'PDF' ? 'pdf' : type === 'PNG' ? 'images' : type === 'VIDEO' ? 'videos' : 'templates'
  const dir = path.join(STORAGE_ROOT, subdir)
  
  const ext = type === 'PDF' ? '.pdf' : type === 'PNG' ? '.png' : type === 'VIDEO' ? '.mp4' : '.xlsx'
  const filename = customFilename || `${id}${ext}`
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
  const subdir = type === 'PDF' ? 'pdf' : type === 'PNG' ? 'images' : type === 'VIDEO' ? 'videos' : 'templates'
  const ext = type === 'PDF' ? '.pdf' : type === 'PNG' ? '.png' : type === 'VIDEO' ? '.mp4' : '.xlsx'
  const filepath = path.join(STORAGE_ROOT, subdir, `${id}${ext}`)
  
  try {
    return await fs.readFile(filepath)
  } catch (error) {
    console.error(`Failed to read artifact ${id}:`, error)
    return null
  }
}

export async function deleteArtifact(id: string, type: ArtifactType): Promise<boolean> {
  const subdir = type === 'PDF' ? 'pdf' : type === 'PNG' ? 'images' : type === 'VIDEO' ? 'videos' : 'templates'
  const ext = type === 'PDF' ? '.pdf' : type === 'PNG' ? '.png' : type === 'VIDEO' ? '.mp4' : '.xlsx'
  const filepath = path.join(STORAGE_ROOT, subdir, `${id}${ext}`)
  
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
    const subdir = type === 'PDF' ? 'pdf' : type === 'PNG' ? 'images' : type === 'VIDEO' ? 'videos' : 'templates'
    const dir = path.join(STORAGE_ROOT, subdir)
    const files = await fs.readdir(dir)
    return files.map(f => f.replace(/\.[^.]+$/, ''))
  }
  
  const allFiles: string[] = []
  for (const subdir of ['pdf', 'images', 'videos', 'templates']) {
    const dir = path.join(STORAGE_ROOT, subdir)
    const files = await fs.readdir(dir)
    allFiles.push(...files.map(f => f.replace(/\.[^.]+$/, '')))
  }
  
  return allFiles
}

export function getStoragePath(type: ArtifactType, filename: string): string {
  const subdir = type === 'PDF' ? 'pdf' : type === 'PNG' ? 'images' : type === 'VIDEO' ? 'videos' : 'templates'
  return path.join(STORAGE_ROOT, subdir, filename)
}
