// Video Generator using Remotion templates (Template-Based)
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { promises as fs } from 'fs'
import { storeArtifact, initializeStorage } from './storage'
import { db } from './db'

const execAsync = promisify(exec)

export interface VideoGenerationOptions {
  template: string
  data: Record<string, any>
  duration: number
  organizationId: string
  generatedBy?: string
  title?: string
}

const VIDEO_TEMPLATES: Record<string, any> = {
  InstagramReel: {
    width: 1080,
    height: 1920,
    fps: 30,
    defaultDuration: 15
  },
  ProductShowcase: {
    width: 1920,
    height: 1080,
    fps: 30,
    defaultDuration: 30
  },
  BrandVideo: {
    width: 1920,
    height: 1080,
    fps: 30,
    defaultDuration: 60
  }
}

export async function generateVideo(options: VideoGenerationOptions): Promise<{ artifactId: string; videoUrl: string }> {
  await initializeStorage()
  
  const templateConfig = VIDEO_TEMPLATES[options.template] || VIDEO_TEMPLATES['BrandVideo']
  const duration = Math.min(options.duration || templateConfig.defaultDuration, 120) // Max 2 minutes
  
  const artifactId = `VID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const title = options.title || `Generated Video - ${options.template}`
  
  // For now, create a placeholder video using FFmpeg
  // In production, this would use Remotion to render from templates
  try {
    // Create a simple color video with text overlay using FFmpeg
    const tempDir = path.join(process.cwd(), 'storage', 'temp')
    await fs.mkdir(tempDir, { recursive: true })
    
    const outputPath = path.join(tempDir, `${artifactId}.mp4`)
    const text = options.data.text || options.data.title || title
    
    // Use FFmpeg to create a simple video
    await execAsync(
      `ffmpeg -f lavfi -i color=c='#1F3A5F':s=${templateConfig.width}x${templateConfig.height}:d=${duration}:r=30 ` +
      `-vf "drawtext=text='${text.replace(/'/g, "\\'")}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" ` +
      `-c:v libx264 -pix_fmt yuv420p -y "${outputPath}"`,
      { timeout: 60000 }
    )
    
    // Read generated video
    const videoBuffer = await fs.readFile(outputPath)
    
    // Store artifact
    const metadata = await storeArtifact(artifactId, 'VIDEO', videoBuffer, `${title}.mp4`)
    
    // Update with correct path
    await fs.rename(outputPath, metadata.path)
    
    // Create database record
    const artifact = await db.artifact.create({
      data: {
        id: artifactId,
        organizationId: options.organizationId,
        title,
        type: 'VIDEO',
        mimeType: 'video/mp4',
        storageLocation: metadata.path,
        status: 'READY',
        generatedBy: options.generatedBy,
        parameters: JSON.stringify({
          template: options.template,
          duration,
          data: options.data
        })
      }
    })
    
    return {
      artifactId: artifact.id,
      videoUrl: `/api/artifacts/${artifact.id}/download`
    }
  } catch (error: any) {
    console.error('[Video Generator] FFmpeg error:', error)
    
    // Create placeholder record
    const artifact = await db.artifact.create({
      data: {
        id: artifactId,
        organizationId: options.organizationId,
        title,
        type: 'VIDEO',
        mimeType: 'video/mp4',
        storageLocation: '',
        status: 'FAILED',
        generatedBy: options.generatedBy,
        parameters: JSON.stringify({ error: error.message })
      }
    })
    
    throw error
  }
}

export async function getVideo(artifactId: string): Promise<Buffer | null> {
  const { getArtifact } = await import('./storage')
  return getArtifact(artifactId, 'VIDEO')
}

export function getAvailableTemplates(): string[] {
  return Object.keys(VIDEO_TEMPLATES)
}
