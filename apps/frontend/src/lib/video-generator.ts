// Video Generator — UGC-style reels assembled locally with ffmpeg.
//
// ponytail: this renders motion from stills (Ken Burns zoompan + xfade) plus
// TTS dialogue and a generated ambient music bed. Ceiling: it is not true
// generative video — footage quality is bounded by the image model. Upgrade
// path: swap assembleReel for a cloud video model (Veo/Kling/Runway) behind
// the same VideoGenerationOptions contract.
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { promises as fs } from 'fs'
import sharp from 'sharp'
import { storeArtifact, initializeStorage } from './storage'
import { db } from './db'
import { createHash } from 'node:crypto'
import { BRAND_COLORS, BRAND_FONT_DISPLAY_SVG, brandLogoBuffer } from './brand-guard'

const execAsync = promisify(execFile)

const NOOR = BRAND_COLORS['Noor Black']
const RUI = BRAND_COLORS['Rui White']
const AGNI = BRAND_COLORS['Agni Red']

const XFADE_SECONDS = 0.6
const END_CARD_SECONDS = 2.5

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c] || c))
}

// Render a card as a PNG with sharp. Not every ffmpeg build ships the
// drawtext filter (the brew build has no freetype), but any build with
// libx264 can loop a PNG into a video — so the text lives in the image.
// Brand: flat Noor Black (Brand Book forbids excessive gradients), white
// serif display type, an Agni Red rule, and the provided house logo.
async function renderTitleCard(text: string, config: { width: number; height: number }, template: string, duration: number): Promise<Buffer> {
  const fontSize = config.width >= 1920 ? 72 : 56
  const maxChars = Math.max(12, Math.floor(config.width / (fontSize * 0.6)))
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    if (line && (line.length + 1 + word.length) > maxChars) { lines.push(line); line = word } else line = line ? `${line} ${word}` : word
    if (lines.length >= 5) break
  }
  if (line && lines.length < 6) lines.push(line)
  const lineHeight = fontSize * 1.35
  const startY = config.height / 2 - ((lines.length - 1) * lineHeight) / 2
  const tspans = lines.map((l, i) => `<tspan x="50%" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(l)}</tspan>`).join('')
  const ruleW = Math.round(config.width * 0.07)
  const svg = `<svg width="${config.width}" height="${config.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${NOOR}"/>
  <rect x="${(config.width - ruleW) / 2}" y="${Math.round(config.height * 0.27)}" width="${ruleW}" height="6" fill="${AGNI}"/>
  <text x="50%" y="${Math.round(startY)}" fill="${RUI}" font-size="${fontSize}" font-weight="bold" text-anchor="middle" font-family="${BRAND_FONT_DISPLAY_SVG}">${tspans}</text>
  <text x="50%" y="${config.height - Math.round(config.height * 0.04)}" fill="rgba(255,255,255,0.4)" font-size="${Math.round(fontSize * 0.4)}" letter-spacing="4" text-anchor="middle" font-family="${BRAND_FONT_DISPLAY_SVG}">${escapeXml(template.toUpperCase())} · EKVAAR</text>
</svg>`
  const base = sharp(Buffer.from(svg)).png()
  const logo = await brandLogoBuffer('logo-white')
  if (!logo) return base.toBuffer()
  const resized = await sharp(logo).resize({ height: Math.round(config.height * 0.1), fit: 'inside' }).png().toBuffer()
  const meta = await sharp(resized).metadata()
  return base.composite([{ input: resized, left: Math.round((config.width - (meta.width || 0)) / 2), top: Math.round(config.height * 0.12) }]).toBuffer()
}

// Closing card: flat Noor Black, the provided white house logo centered, and
// a quiet serif tagline. No redrawn marks — the shipped asset only.
async function renderEndCard(config: { width: number; height: number }, tagline: string): Promise<Buffer> {
  const { width, height } = config
  const fontSize = width >= 1920 ? 36 : 30
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${NOOR}"/>
  <text x="50%" y="${Math.round(height * 0.66)}" fill="rgba(255,255,255,0.75)" font-size="${fontSize}" letter-spacing="3" text-anchor="middle" font-family="${BRAND_FONT_DISPLAY_SVG}">${escapeXml(tagline)}</text>
  <text x="50%" y="${Math.round(height * 0.66) + Math.round(fontSize * 1.9)}" fill="${AGNI}" font-size="${Math.round(fontSize * 0.5)}" letter-spacing="6" text-anchor="middle" font-family="${BRAND_FONT_DISPLAY_SVG}">INDIA KA ORIGINAL</text>
</svg>`
  // SVG first: its opaque Noor rect would otherwise cover the logo.
  const overlays: { input: Buffer; left: number; top: number }[] = [{ input: Buffer.from(svg), left: 0, top: 0 }]
  const logo = await brandLogoBuffer('logo-white')
  if (logo) {
    const resized = await sharp(logo).resize({ height: Math.round(height * 0.2), fit: 'inside' }).png().toBuffer()
    const meta = await sharp(resized).metadata()
    overlays.push({ input: resized, left: Math.round((width - (meta.width || 0)) / 2), top: Math.round(height * 0.36) })
  }
  return sharp({ create: { width, height, channels: 4, background: NOOR } }).composite(overlays).png().toBuffer()
}

export interface ReelScene {
  imagePath: string
  voicePath?: string
  line?: string
}

export interface VideoGenerationOptions {
  template: string
  data: Record<string, any>
  duration: number
  organizationId: string
  generatedBy?: string
  title?: string
  scenes?: ReelScene[]
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

// Assemble the UGC reel in one ffmpeg pass:
//   video: scene stills → cover-crop → Ken Burns (alternating zoom in/out)
//          → chained xfade transitions → brand end card
//   audio: ambient chord bed (aevalsrc) + per-scene voiceovers (adelay) mixed
//          with amix, faded out over the end card.
async function assembleReel(scenes: ReelScene[], options: VideoGenerationOptions, templateConfig: any, duration: number, tempDir: string): Promise<string> {
  const { width, height, fps } = templateConfig
  const n = scenes.length
  const fade = Math.min(XFADE_SECONDS, 0.45 * ((duration - END_CARD_SECONDS) / n))
  const sceneDur = Math.min(8, Math.max(2, (duration - END_CARD_SECONDS + (n - 1) * fade) / n))
  const totalDur = n * sceneDur - (n - 1) * fade + END_CARD_SECONDS
  const sceneFrames = Math.round(sceneDur * fps)

  const inputs: string[] = []
  const filters: string[] = []

  for (let i = 0; i < n; i++) {
    // ffmpeg has no SVG decoder — the image generator's vector fallback
    // produces .svg stills, so rasterize them to PNG first
    let imagePath = scenes[i].imagePath
    if (imagePath.toLowerCase().endsWith('.svg')) {
      const pngPath = path.join(tempDir, `scene-${i}-${Date.now()}.png`)
      await sharp(imagePath).resize({ width: Math.max(width, height), fit: 'inside' }).png().toFile(pngPath)
      imagePath = pngPath
    }
    // Single-image input: zoompan expands one frame into sceneFrames frames.
    inputs.push('-i', imagePath)
    // Ken Burns: alternate slow zoom-in / zoom-out so cuts feel alive.
    const step = (0.15 / sceneFrames).toFixed(6)
    const zExpr = i % 2 === 0
      ? `if(eq(on,1),1.0,min(1.15,zoom+${step}))`
      : `if(eq(on,1),1.15,max(1.0,zoom-${step}))`
    filters.push(
      `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,` +
      `zoompan=z='${zExpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${sceneFrames}:s=${width}x${height}:fps=${fps},format=yuv420p[v${i}]`
    )
  }

  const endCardPath = path.join(tempDir, 'end-card.png')
  await fs.writeFile(endCardPath, await renderEndCard(templateConfig, options.data.tagline || options.title || 'EKVAAR'))
  inputs.push('-loop', '1', '-framerate', String(fps), '-t', String(END_CARD_SECONDS), '-i', endCardPath)
  filters.push(`[${n}:v]scale=${width}:${height},setsar=1,format=yuv420p[end]`)

  // Crossfade chain: offset of each join = accumulated output length − fade.
  let prev = 'v0'
  let accLen = sceneDur
  for (let i = 1; i <= n; i++) {
    const next = i === n ? 'end' : `v${i}`
    const out = i === n ? 'vout' : `x${i}`
    filters.push(`[${prev}][${next}]xfade=transition=fade:duration=${fade}:offset=${(accLen - fade).toFixed(3)}[${out}]`)
    prev = out
    accLen += (i === n ? END_CARD_SECONDS : sceneDur) - fade
  }

  // Music bed: quiet A-minor-ish ambient chord with a slow shimmer, generated
  // procedurally so no licensed track is needed. Ceiling: it is a mood pad,
  // not a produced score. Upgrade path: swap for a licensed track artifact.
  const bedExpr = '0.05*sin(2*PI*110*t)+0.04*sin(2*PI*165*t)+0.035*sin(2*PI*220*t)*(0.6+0.4*sin(2*PI*0.2*t))'
  filters.push(`aevalsrc='${bedExpr}':s=44100:d=${totalDur.toFixed(3)},afade=t=out:st=${(totalDur - 1.2).toFixed(3)}:d=1.2[bed]`)

  const mixInputs = ['[bed]']
  let nextInput = n + 1
  scenes.forEach((scene, i) => {
    if (!scene.voicePath) return
    inputs.push('-i', scene.voicePath)
    const startMs = Math.round((i * (sceneDur - fade) + 0.3) * 1000)
    filters.push(
      `[${nextInput}:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${(sceneDur - 0.4).toFixed(3)},` +
      `adelay=${startMs}|${startMs},volume=2.4[vo${i}]`
    )
    mixInputs.push(`[vo${i}]`)
    nextInput++
  })
  filters.push(`${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:normalize=0[aout]`)

  const outputPath = path.join(tempDir, `reel-${Date.now()}.mp4`)
  await execAsync(
    'ffmpeg', ['-hide_banner', '-loglevel', 'error', ...inputs, '-filter_complex', filters.join(';'),
    '-map', '[vout]', '-map', '[aout]', '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-y', outputPath],
    { timeout: 600000 }
  )
  await fs.unlink(endCardPath).catch(() => {})
  return outputPath
}

export async function generateVideo(options: VideoGenerationOptions): Promise<{ artifactId: string; videoUrl: string }> {
  await initializeStorage()
  
  const templateConfig = VIDEO_TEMPLATES[options.template] || VIDEO_TEMPLATES['BrandVideo']
  const duration = Math.min(options.duration || templateConfig.defaultDuration, 120) // Max 2 minutes
  
  const artifactId = `VID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const title = options.title || `Generated Video - ${options.template}`
  const hasScenes = Array.isArray(options.scenes) && options.scenes.length > 0
  
  try {
    const tempDir = path.join(process.cwd(), 'storage', 'temp')
    await fs.mkdir(tempDir, { recursive: true })
    
    let outputPath: string
    if (hasScenes) {
      // UGC reel: motion, dialogue, music, brand end card.
      outputPath = await assembleReel(options.scenes!, options, templateConfig, duration, tempDir)
      await Promise.all(options.scenes!.map((s) => s.voicePath ? fs.unlink(s.voicePath).catch(() => {}) : Promise.resolve()))
    } else {
      // No scenes supplied (legacy callers): single branded title card.
      const cardPath = path.join(tempDir, `${artifactId}-card.png`)
      const text = options.data.text || options.data.title || title
      await fs.writeFile(cardPath, await renderTitleCard(text, templateConfig, options.template, duration))
      outputPath = path.join(tempDir, `${artifactId}.mp4`)
      await execAsync(
        'ffmpeg', ['-loop', '1', '-framerate', String(templateConfig.fps), '-i', cardPath,
        '-t', String(duration), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-y', outputPath],
        { timeout: 120000 }
      )
      await fs.unlink(cardPath).catch(() => {})
    }
    
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
        contentHash: createHash('sha256').update(videoBuffer).digest('hex'),
        byteSize: videoBuffer.length,
        parameters: JSON.stringify({
          template: options.template,
          duration,
          scenes: hasScenes ? options.scenes!.map((s) => ({ line: s.line || null, hasVoice: Boolean(s.voicePath) })) : undefined,
          data: options.data
        })
      }
    })
    
    return {
      artifactId: artifact.id,
      videoUrl: `/api/artifacts/${artifact.id}`
    }
  } catch (error: any) {
    console.error('[Video Generator] FFmpeg error:', error.message)
    throw new Error(`BLOCKED: Video rendering failed: ${error?.message || 'ffmpeg unavailable'}`)
  }
}

export async function getVideo(artifactId: string): Promise<Buffer | null> {
  const { getArtifact } = await import('./storage')
  return getArtifact(artifactId, 'VIDEO')
}

export function getAvailableTemplates(): string[] {
  return Object.keys(VIDEO_TEMPLATES)
}
