// Image Generator using AWS Bedrock Nova Canvas
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { generateImage as generateModelImage } from 'ai'
import { storeArtifact, initializeStorage } from './storage'
import { db } from './db'
import { createHash } from 'node:crypto'
import { decryptSecret } from './crypto'
import { BRAND_IMAGE_STYLE_LINE } from './brand-guard'

export interface ImageGenerationOptions {
  prompt: string
  aspectRatio: '1:1' | '16:9' | '9:16'
  style: 'product' | 'lifestyle' | 'abstract'
  organizationId: string
  generatedBy?: string
  title?: string
  referenceImage?: string // url or artifact id (max 2 supported upstream)
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

export async function generateImage(options: ImageGenerationOptions): Promise<{ artifactId: string; imageUrl: string }> {
  await initializeStorage()
  
  // Apply style template to prompt. Brand context rides with every prompt —
  // the agent's brand instructions never reach the image model itself.
  const styleTemplate = IMAGE_PROMPT_TEMPLATES[options.style] || IMAGE_PROMPT_TEMPLATES['product']
  const enhancedPrompt = `${BRAND_IMAGE_STYLE_LINE} ${styleTemplate.replace('{prompt}', options.prompt)}`
  
  const dimensions = ASPECT_RATIO_DIMENSIONS[options.aspectRatio] || ASPECT_RATIO_DIMENSIONS['1:1']
  
  try {
    const settings = await db.systemSetting.findUnique({ where: { organizationId: options.organizationId } })
    const targets = settings ? [
      { provider: settings.primaryProvider, key: decryptSecret(settings.primaryApiKey) },
      { provider: settings.fallback1Provider, key: decryptSecret(settings.fallback1ApiKey) },
      { provider: settings.fallback2Provider, key: decryptSecret(settings.fallback2ApiKey) },
    ] : []
    const keyFor = (provider: string) => targets.find((target) => target.provider.toLowerCase() === provider && target.key)?.key
    const omnirouteKey = keyFor('omniroute')
    const bedrockKey = keyFor('bedrock')
    const openRouterKey = keyFor('openrouter')
    const openAIKey = keyFor('openai')
    let imageBuffer: Buffer | null = null
    let mimeType = 'image/png'
    const providerErrors: string[] = []

    if (!imageBuffer && omnirouteKey) {
      try {
        const baseUrl = settings?.primaryBaseUrl || process.env.OMNIROUTE_BASE_URL || 'http://localhost:20128/v1'
        const response = await fetch(`${baseUrl}/images/generations`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${omnirouteKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: process.env.OMNIROUTE_IMAGE_MODEL || 'antigravity/gemini-3.1-flash-image',
            prompt: enhancedPrompt,
            n: 1,
            size: `${dimensions.width}x${dimensions.height}`,
          }),
        })
        const payload = await response.json()
        if (!response.ok || !payload.data?.[0]?.b64_json) throw new Error(payload.error?.message || `OmniRoute returned ${response.status}`)
        imageBuffer = Buffer.from(payload.data[0].b64_json, 'base64')
      } catch (error: any) {
        providerErrors.push(`OmniRoute: ${error?.message || 'unknown error'}`)
      }
    }

    if (!imageBuffer && bedrockKey) {
      try {
        // Use the API-key provider, matching the Bedrock credentials deployed
        // for agent text generation. An invalid key falls through to OpenRouter.
        const bedrock = createAmazonBedrock({ apiKey: bedrockKey, region: process.env.AWS_REGION || 'us-east-1' })
        const bedrockOpts: any = { quality: 'standard', cfgScale: 8, style: options.style === 'abstract' ? 'GRAPHIC_NOVEL_ILLUSTRATION' : 'PHOTOREALISM' }
        if (options.referenceImage) bedrockOpts.image = options.referenceImage
        const result = await generateModelImage({
          model: bedrock.image('amazon.nova-canvas-v1:0'),
          prompt: enhancedPrompt,
          size: `${dimensions.width}x${dimensions.height}`,
          n: 1,
          providerOptions: { bedrock: bedrockOpts },
        })
        imageBuffer = Buffer.from(result.image.uint8Array)
      } catch (error: any) {
        providerErrors.push(`Bedrock: ${error?.message || 'unknown error'}`)
        console.warn('[Image Generator] Bedrock failed; trying fallback providers:', error)
      }
    }

    if (!imageBuffer && openRouterKey) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/images', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openRouterKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image',
            prompt: enhancedPrompt,
            n: 1,
            aspect_ratio: options.aspectRatio,
            quality: 'medium',
            output_format: 'png',
          }),
        })
        const payload = await response.json()
        if (!response.ok || !payload.data?.[0]?.b64_json) throw new Error(payload.error?.message || `OpenRouter returned ${response.status}`)
        imageBuffer = Buffer.from(payload.data[0].b64_json, 'base64')
        mimeType = payload.data[0].media_type || mimeType
      } catch (error: any) {
        providerErrors.push(`OpenRouter: ${error?.message || 'unknown error'}`)
      }
    }

    if (!imageBuffer && openAIKey) {
      try {
        const size = options.aspectRatio === '16:9' ? '1536x1024' : options.aspectRatio === '9:16' ? '1024x1536' : '1024x1024'
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openAIKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1', prompt: enhancedPrompt, size, quality: 'medium', response_format: 'b64_json' }),
        })
        const payload = await response.json()
        if (!response.ok || !payload.data?.[0]?.b64_json) throw new Error(payload.error?.message || `OpenAI returned ${response.status}`)
        imageBuffer = Buffer.from(payload.data[0].b64_json, 'base64')
      } catch (error: any) {
        providerErrors.push(`OpenAI: ${error?.message || 'unknown error'}`)
      }
    }

    if (!imageBuffer) {
      const detail = providerErrors.length > 0 ? ` Provider errors: ${providerErrors.join(' | ')}` : ''
      throw new Error(`No working image provider is configured for this organization. Add OmniRoute, Bedrock, OpenRouter, or OpenAI credentials in Settings.${detail}`)
    }
    
    // Store artifact
    const artifactId = `IMG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const title = options.title || `Generated Image - ${options.style}`
    const metadata = await storeArtifact(artifactId, 'PNG', imageBuffer, `${title}.${mimeType === 'image/svg+xml' ? 'svg' : 'png'}`)
    
    // Create database record
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
      }
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
