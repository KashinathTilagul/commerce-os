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
      videoUrl: `/api/artifacts/${artifact.id}`
    }
  } catch (error: any) {
    console.error('[Video Generator] FFmpeg error, generating storyboard fallback:', error.message)

    // ponytail: FFmpeg not available — generate an HTML5 motion storyboard.
    // Upgrade path: install FFmpeg in Docker (already done in Dockerfile) or
    // switch to a cloud rendering API.
    const text = options.data.text || options.data.title || title
    const safeText = text.replace(/[<>&"']/g, (c: string) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c] || c))
    const storyboard = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${safeText}</title>
<style>
  * { margin:0; box-sizing:border-box; }
  body { background:#0a0a1a; display:flex; align-items:center; justify-content:center;
         min-height:100vh; font-family:'Helvetica Neue',Arial,sans-serif; overflow:hidden; }
  .frame { width:${templateConfig.width/2}px; height:${templateConfig.height/2}px;
           background:linear-gradient(135deg,#1F3A5F,#C8302A); border-radius:16px;
           display:flex; flex-direction:column; align-items:center; justify-content:center;
           position:relative; overflow:hidden; }
  .frame::before { content:''; position:absolute; inset:0;
    background:radial-gradient(circle at 30% 40%,rgba(255,255,255,0.08),transparent 60%); }
  .label { font-size:11px; color:rgba(255,255,255,0.4); letter-spacing:4px; margin-bottom:24px;
           animation:fadeIn 1s ease-out; }
  .text { font-size:36px; font-weight:700; color:#fff; text-align:center; padding:0 40px;
          animation:slideUp 0.8s ease-out 0.3s both; }
  .meta { position:absolute; bottom:24px; font-size:12px; color:rgba(255,255,255,0.3);
          animation:fadeIn 1.5s ease-out 0.6s both; }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
</style></head>
<body><div class="frame">
  <div class="label">VIDEO STORYBOARD</div>
  <div class="text">${safeText}</div>
  <div class="meta">${options.template} · ${duration}s · ${templateConfig.width}×${templateConfig.height} · Ekvaar OS</div>
</div></body></html>`

    const buffer = Buffer.from(storyboard, 'utf-8')
    const metadata = await storeArtifact(artifactId, 'VIDEO', buffer, `${artifactId}.html`)

    await db.artifact.create({
      data: {
        id: artifactId,
        organizationId: options.organizationId,
        title,
        type: 'VIDEO',
        mimeType: 'text/html',
        storageLocation: metadata.path,
        status: 'READY',
        generatedBy: options.generatedBy,
        parameters: JSON.stringify({ template: options.template, duration, data: options.data, fallback: true })
      }
    })

    return {
      artifactId,
      videoUrl: `/api/artifacts/${artifactId}`
    }
  }
}

export async function getVideo(artifactId: string): Promise<Buffer | null> {
  const { getArtifact } = await import('./storage')
  return getArtifact(artifactId, 'VIDEO')
}

export function getAvailableTemplates(): string[] {
  return Object.keys(VIDEO_TEMPLATES)
}
