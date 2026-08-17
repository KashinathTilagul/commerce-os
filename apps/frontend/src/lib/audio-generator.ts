import { createHash } from 'node:crypto'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { promises as fs } from 'fs'
import { db } from './db'
import { decryptSecret } from './crypto'
import { initializeStorage, storeArtifact } from './storage'

const execFileAsync = promisify(execFile)

export interface AudioGenerationOptions {
  text: string
  organizationId: string
  generatedBy?: string
  title?: string
  voice?: string
}

/**
 * Speak text into a temp MP3 and return its path, or null when nothing works.
 * OpenAI TTS when the org configured a speech key; otherwise the macOS `say`
 * binary (offline, free, ships with the dev host and the Mac runtime).
 *
 * ponytail: `say` voices are robotic and English-only — ceiling for UGC reel
 * dialogue quality. Upgrade path: set an OpenAI Speech key in Settings, or a
 * cloud TTS provider; this function is the single swap point.
 */
export async function synthesizeSpeech(text: string, organizationId: string, voice?: string): Promise<{ path: string; provider: string } | null> {
  const clean = text.trim().slice(0, 600)
  if (!clean) return null

  const tempDir = path.join(process.cwd(), 'storage', 'temp')
  await fs.mkdir(tempDir, { recursive: true })
  const outPath = path.join(tempDir, `vo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`)

  const settings = await db.systemSetting.findUnique({ where: { organizationId } })
  const openAIKey = settings?.speechProvider === 'openai' ? decryptSecret(settings.speechApiKey) : ''
  if (openAIKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openAIKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OPENAI_TTS_MODEL || 'tts-1',
          voice: voice || process.env.OPENAI_TTS_VOICE || 'onyx',
          input: clean,
          response_format: 'mp3',
        }),
      })
      if (!response.ok) throw new Error(`OpenAI returned ${response.status}`)
      await fs.writeFile(outPath, Buffer.from(await response.arrayBuffer()))
      return { path: outPath, provider: 'openai' }
    } catch (error) {
      console.warn('[Audio Generator] OpenAI TTS failed; falling back to local speech:', error)
    }
  }

  if (process.platform === 'darwin') {
    const aiffPath = outPath.replace(/\.mp3$/, '.aiff')
    try {
      // Text is LLM-generated — pass it as an argv entry, never into a shell string.
      await execFileAsync('/usr/bin/say', ['-o', aiffPath, clean], { timeout: 60000 })
      await execFileAsync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', aiffPath, '-codec:a', 'libmp3lame', '-qscale:a', '4', '-y', outPath], { timeout: 60000 })
      await fs.unlink(aiffPath).catch(() => {})
      return { path: outPath, provider: 'say' }
    } catch (error) {
      console.warn('[Audio Generator] Local speech synthesis failed:', error)
    }
  }

  return null
}

export async function generateAudio(options: AudioGenerationOptions): Promise<{ artifactId: string; audioUrl: string }> {
  await initializeStorage()
  const text = options.text.trim().slice(0, 4000)
  if (!text) throw new Error('Audio text is required')

  const speech = await synthesizeSpeech(text, options.organizationId, options.voice)
  if (!speech) throw new Error('No working speech provider is configured for this organization. Add a Speech API key in Settings.')

  const audioBuffer = await fs.readFile(speech.path)
  await fs.unlink(speech.path).catch(() => {})

  const artifactId = `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  const title = options.title || 'Generated Audio'
  const metadata = await storeArtifact(artifactId, 'AUDIO', audioBuffer, `${artifactId}.mp3`)
  await db.artifact.create({
    data: {
      id: artifactId,
      organizationId: options.organizationId,
      title,
      type: 'AUDIO',
      mimeType: 'audio/mpeg',
      storageLocation: metadata.path,
      status: 'READY',
      generatedBy: options.generatedBy,
      contentHash: createHash('sha256').update(audioBuffer).digest('hex'),
      byteSize: audioBuffer.length,
      parameters: JSON.stringify({ text, voice: options.voice || 'male', provider: speech.provider }),
    },
  })
  return { artifactId, audioUrl: `/api/artifacts/${artifactId}` }
}
