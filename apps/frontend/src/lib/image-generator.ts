// Image Generator using AWS Bedrock Nova Canvas
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { generateImage as generateModelImage } from 'ai'
import { storeArtifact, initializeStorage } from './storage'
import { db } from './db'
import { createHash } from 'node:crypto'

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
  
  // Apply style template to prompt
  const styleTemplate = IMAGE_PROMPT_TEMPLATES[options.style] || IMAGE_PROMPT_TEMPLATES['product']
  const enhancedPrompt = styleTemplate.replace('{prompt}', options.prompt)
  
  const dimensions = ASPECT_RATIO_DIMENSIONS[options.aspectRatio] || ASPECT_RATIO_DIMENSIONS['1:1']
  
  try {
    const bedrockKey = process.env.AWS_BEARER_TOKEN_BEDROCK
    const openRouterKey = process.env.OPENROUTER_API_KEY
    let imageBuffer: Buffer | null = null
    let mimeType = 'image/png'
    const providerErrors: string[] = []

    if (bedrockKey) {
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

    if (!imageBuffer && process.env.OPENAI_API_KEY) {
      try {
        const size = options.aspectRatio === '16:9' ? '1536x1024' : options.aspectRatio === '9:16' ? '1024x1536' : '1024x1024'
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
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
      console.warn('[Image Generator] Providers unavailable; rendering vector fallback:', providerErrors.join(' | '))
      imageBuffer = renderVectorFallback(options.prompt, dimensions.width, dimensions.height)
      mimeType = 'image/svg+xml'
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

function renderVectorFallback(prompt: string, width: number, height: number) {
  const digest = createHash('sha256').update(prompt).digest('hex')
  const colorA = `#${digest.slice(0, 6)}`
  const colorB = `#${digest.slice(6, 12)}`
  const colorC = `#${digest.slice(12, 18)}`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><radialGradient id="g" cx="35%" cy="30%" r="85%"><stop stop-color="${colorA}"/><stop offset="0.55" stop-color="${colorB}"/><stop offset="1" stop-color="#05080d"/></radialGradient><filter id="b"><feGaussianBlur stdDeviation="28"/></filter></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="${width * 0.52}" cy="${height * 0.5}" r="${Math.min(width, height) * 0.24}" fill="none" stroke="${colorC}" stroke-width="${Math.max(6, width / 120)}" opacity="0.8"/>
  <circle cx="${width * 0.52}" cy="${height * 0.5}" r="${Math.min(width, height) * 0.13}" fill="${colorC}" opacity="0.32" filter="url(#b)"/>
  <path d="M ${width * 0.18} ${height * 0.62} Q ${width * 0.5} ${height * 0.16} ${width * 0.84} ${height * 0.58}" fill="none" stroke="white" stroke-width="${Math.max(3, width / 240)}" opacity="0.42"/>
</svg>`
  return Buffer.from(svg)
}

export async function getImage(artifactId: string): Promise<Buffer | null> {
  const { getArtifact } = await import('./storage')
  return getArtifact(artifactId, 'PNG')
}
