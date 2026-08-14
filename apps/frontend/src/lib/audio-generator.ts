import { createHash } from 'node:crypto'
import { db } from './db'
import { decryptSecret } from './crypto'
import { initializeStorage, storeArtifact } from './storage'

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
  const settings = await db.systemSetting.findUnique({ where: { organizationId: options.organizationId } })
  const openAIKey = settings?.speechProvider === 'openai' ? decryptSecret(settings.speechApiKey) : ''

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

  if (!audioBuffer) throw new Error('No working speech provider is configured for this organization. Add a Speech API key in Settings.')

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
