// Image Generator using AWS Bedrock Nova Canvas
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { generateImage as generateModelImage } from 'ai'
import { storeArtifact, initializeStorage } from './storage'
import { db } from './db'

export interface ImageGenerationOptions {
  prompt: string
  aspectRatio: '1:1' | '16:9' | '9:16'
  style: 'product' | 'lifestyle' | 'abstract'
  organizationId: string
  generatedBy?: string
  title?: string
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
    let imageBuffer: Buffer
    let mimeType = 'image/png'

    if (bedrockKey) {
      // Use the API-key provider, matching the Bedrock credentials deployed for
      // agent text generation. The AWS SDK credential chain cannot use that key.
      const bedrock = createAmazonBedrock({ apiKey: bedrockKey, region: process.env.AWS_REGION || 'us-east-1' })
      const result = await generateModelImage({
        model: bedrock.image('amazon.nova-canvas-v1:0'),
        prompt: enhancedPrompt,
        size: `${dimensions.width}x${dimensions.height}`,
        n: 1,
        providerOptions: {
          bedrock: {
            quality: 'standard',
            cfgScale: 8,
            style: options.style === 'abstract' ? 'GRAPHIC_NOVEL_ILLUSTRATION' : 'PHOTOREALISM',
          },
        },
      })
      imageBuffer = Buffer.from(result.image.uint8Array)
    } else if (openRouterKey) {
      // OpenRouter is the deployed image fallback when no Bedrock key exists.
      // Its image API returns real base64 image bytes, not a descriptive card.
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
    } else {
      throw new Error('No image provider is configured. Set AWS_BEARER_TOKEN_BEDROCK or OPENROUTER_API_KEY.')
    }
    
    // Store artifact
    const artifactId = `IMG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const title = options.title || `Generated Image - ${options.style}`
    const metadata = await storeArtifact(artifactId, 'PNG', imageBuffer, `${title}.png`)
    
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
        parameters: JSON.stringify({ 
          prompt: options.prompt, 
          style: options.style, 
          aspectRatio: options.aspectRatio 
        })
      }
    })
    
    return {
      artifactId: artifact.id,
      imageUrl: `/api/artifacts/${artifact.id}`
    }
  } catch (error: any) {
    console.error('[Image Generator] Nova Canvas error:', error)
    throw new Error(`Nova Canvas image generation failed: ${error?.message || 'unknown error'}`)
  }
}

export async function getImage(artifactId: string): Promise<Buffer | null> {
  const { getArtifact } = await import('./storage')
  return getArtifact(artifactId, 'PNG')
}
