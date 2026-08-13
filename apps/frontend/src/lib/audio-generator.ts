import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { db } from './db'
import { initializeStorage, storeArtifact } from './storage'

const execFileAsync = promisify(execFile)

export interface AudioGenerationOptions {
  text: string
  organizationId: string
  generatedBy?: string
  title?: string
  voice?: string
}

export async function generateAudio(options: AudioGenerationOptions): Promise<{ artifactId: string; audioUrl: string }> {
  await initializeStorage()
  const text = options.text.trim().slice(0, 4000)
  if (!text) throw new Error('Audio text is required')

  let audioBuffer: Buffer | null = null
  let provider = 'openai'
  const openAIKey = process.env.OPENAI_API_KEY

  if (openAIKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openAIKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OPENAI_TTS_MODEL || 'tts-1',
          voice: options.voice || process.env.OPENAI_TTS_VOICE || 'onyx',
          input: text,
          response_format: 'mp3',
        }),
      })
      if (!response.ok) throw new Error(`OpenAI returned ${response.status}`)
      audioBuffer = Buffer.from(await response.arrayBuffer())
    } catch (error) {
      console.warn('[Audio Generator] OpenAI failed; using local speech synthesis:', error)
    }
  }

  if (!audioBuffer) {
    provider = 'espeak-ng'
    const tempDir = path.join(process.cwd(), 'storage', 'temp')
    await fs.mkdir(tempDir, { recursive: true })
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const wavPath = path.join(tempDir, `${token}.wav`)
    const mp3Path = path.join(tempDir, `${token}.mp3`)
    try {
      await execFileAsync('espeak-ng', ['-v', 'en+m3', '-s', '155', '-w', wavPath, text], { timeout: 30000 })
      await execFileAsync('ffmpeg', ['-i', wavPath, '-codec:a', 'libmp3lame', '-q:a', '4', '-y', mp3Path], { timeout: 30000 })
      audioBuffer = await fs.readFile(mp3Path)
    } finally {
      await Promise.all([fs.rm(wavPath, { force: true }), fs.rm(mp3Path, { force: true })])
    }
  }

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
      parameters: JSON.stringify({ text, voice: options.voice || 'male', provider }),
    },
  })
  return { artifactId, audioUrl: `/api/artifacts/${artifactId}` }
}
