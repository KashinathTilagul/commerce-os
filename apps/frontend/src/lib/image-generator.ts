// Image Generator using OmniRoute Gateway
import { createOpenAI } from '@ai-sdk/openai'
import { generateImage as generateModelImage } from 'ai'
import { storeArtifact, initializeStorage } from './storage'
import { db } from './db'
import { decryptSecret } from './crypto'
import { createHash } from 'node:crypto'

export interface ImageGenerationOptions {
  prompt: string
  aspectRatio: '1:1' | '16:9' | '9:16'
  style: 'product' | 'lifestyle' | 'abstract'
  organizationId: string
  generatedBy?: string
  title?: string
  referenceImage?: string
  modelId?: string
}

const IMAGE_PROMPT_TEMPLATES: Record<string, string> = {
  product: 'Professional product photography, {prompt}, studio lighting, white background, high detail, commercial quality',
  lifestyle: 'Lifestyle photography, {prompt}, natural lighting, vibrant colors, contemporary setting, aspirational',
  abstract: 'Abstract artistic image, {prompt}, bold colors, geometric shapes, modern art style'
}

const ASPECT_RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 }
}

const OMNIROUTE_BASE_URL = process.env.OMNIROUTE_BASE_URL || 'http://localhost:20128/v1'
const DEFAULT_IMAGE_MODEL = process.env.OMNIROUTE_IMAGE_MODEL_DEFAULT || ''

async function getOmniRouteImageConfig(organizationId: string) {
  try {
    const settings = await db.systemSetting.findUnique({ where: { organizationId } })
    const slots = settings ? [
      { provider: settings.primaryProvider, apiKey: settings.primaryApiKey, baseUrl: settings.primaryBaseUrl },
      { provider: settings.fallback1Provider, apiKey: settings.fallback1ApiKey, baseUrl: settings.fallback1BaseUrl },
      { provider: settings.fallback2Provider, apiKey: settings.fallback2ApiKey, baseUrl: settings.fallback2BaseUrl },
    ] : []
    const omniroute = slots.find((slot) => slot.provider.toLowerCase() === 'omniroute' && slot.apiKey)
    return {
      apiKey: omniroute?.apiKey ? await decryptSecret(omniroute.apiKey) : '',
      baseUrl: omniroute?.baseUrl || '',
      imageModel: settings?.omnirouteImageModel || DEFAULT_IMAGE_MODEL,
    }
  } catch {
    return { apiKey: '', baseUrl: '', imageModel: DEFAULT_IMAGE_MODEL }
  }
}

export async function generateImage(options: ImageGenerationOptions): Promise<{ artifactId: string; imageUrl: string }> {
  await initializeStorage()
  
  const styleTemplate = IMAGE_PROMPT_TEMPLATES[options.style] || IMAGE_PROMPT_TEMPLATES['product']
  const enhancedPrompt = styleTemplate.replace('{prompt}', options.prompt)
  
  const dimensions = ASPECT_RATIO_DIMENSIONS[options.aspectRatio] || ASPECT_RATIO_DIMENSIONS['1:1']
  
  try {
    let imageBuffer: Buffer | null = null
    let mimeType = 'image/png'
    const providerErrors: string[] = []

    const omnirouteConfig = await getOmniRouteImageConfig(options.organizationId)
    const omnirouteApiKey = omnirouteConfig.apiKey
    const omnirouteBaseUrl = omnirouteConfig.baseUrl || OMNIROUTE_BASE_URL
    const omnirouteImageModel = options.modelId || omnirouteConfig.imageModel || DEFAULT_IMAGE_MODEL

    if (omnirouteApiKey && omnirouteImageModel) {
      try {
        const omniroute = createOpenAI({
          baseURL: omnirouteBaseUrl,
          apiKey: omnirouteApiKey,
        })
        const result = await generateModelImage({
          model: omniroute.image(omnirouteImageModel),
          prompt: enhancedPrompt,
          size: `${dimensions.width}x${dimensions.height}`,
          n: 1,
        })
        const firstImage = result.images[0]
        imageBuffer = firstImage?.uint8Array
          ? Buffer.from(firstImage.uint8Array)
          : firstImage?.base64
            ? Buffer.from(firstImage.base64, 'base64')
            : null
        if (!imageBuffer) {
          throw new Error('OmniRoute returned empty image data')
        }
        console.log('[Image Generator] OmniRoute succeeded')
      } catch (error: any) {
        providerErrors.push(`OmniRoute: ${error?.message || 'unknown error'}`)
        console.warn('[Image Generator] OmniRoute failed:', error?.message || error)
      }
    }

    if (!imageBuffer) {
      const reason = !omnirouteApiKey
        ? 'No organization-owned image provider is configured'
        : !omnirouteImageModel
          ? 'No verified OmniRoute image model is selected'
          : providerErrors.join(' | ') || 'OmniRoute returned no media'
      throw new Error(`BLOCKED: ${reason}`)
    }
    
    const artifactId = `IMG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const title = options.title || `Generated Image - ${options.style}`
    const metadata = await storeArtifact(artifactId, 'PNG', imageBuffer, `${title}.png`)
    
    const artifact = await db.artifact.create({
      data: {
        id: artifactId,
        organizationId: options.organizationId,
        title,
        type: 'PNG',
        mimeType,
        storageLocation: metadata.path,
        status: 'READY',
        generatedBy: options.generatedBy,
        contentHash: createHash('sha256').update(imageBuffer).digest('hex'),
        byteSize: imageBuffer.length,
        parameters: JSON.stringify({ 
          prompt: options.prompt, 
          style: options.style, 
          aspectRatio: options.aspectRatio,
          providerErrors,
        })
      },
    })
    
    return {
      artifactId: artifact.id,
      imageUrl: `/api/artifacts/${artifact.id}`
    }
  } catch (error: any) {
    console.error('[Image Generator] Image generation error:', error)
    throw new Error(`Image generation failed: ${error?.message || 'unknown error'}`)
  }
}

export async function getImage(artifactId: string): Promise<Buffer | null> {
  const { getArtifact } = await import('./storage')
  return getArtifact(artifactId, 'PNG')
}
