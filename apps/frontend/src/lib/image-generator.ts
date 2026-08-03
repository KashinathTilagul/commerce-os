// Image Generator using AWS Bedrock Nova Canvas
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { storeArtifact, initializeStorage } from './storage'
import { db } from './db'

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' })

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
  
  // Call Bedrock Nova Canvas
  try {
    const response = await bedrockClient.send(new InvokeModelCommand({
      modelId: 'amazon.nova-canvas-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        taskType: 'TEXT_IMAGE',
        textToImageParams: {
          text: enhancedPrompt
        },
        imageGenerationConfig: {
          numberOfImages: 1,
          height: dimensions.height,
          width: dimensions.width,
          quality: 'standard',
          cfgScale: 8.0,
          seed: Math.floor(Math.random() * 2147483647)
        }
      })
    }))
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body))
    
    if (!responseBody.images || responseBody.images.length === 0) {
      throw new Error('No image generated')
    }
    
    // Decode base64 image
    const imageBase64 = responseBody.images[0]
    const imageBuffer = Buffer.from(imageBase64, 'base64')
    
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
        mimeType: 'image/png',
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
      imageUrl: `/api/artifacts/${artifact.id}/download`
    }
  } catch (error: any) {
    console.error('[Image Generator] Bedrock error:', error)
    
    // If Nova Canvas not available, create placeholder
    const placeholderImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
    
    const artifactId = `IMG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const metadata = await storeArtifact(artifactId, 'PNG', placeholderImage, 'placeholder.png')
    
    const artifact = await db.artifact.create({
      data: {
        id: artifactId,
        organizationId: options.organizationId,
        title: options.title || 'Generated Image',
        type: 'PNG',
        mimeType: 'image/png',
        storageLocation: metadata.path,
        status: 'FAILED',
        generatedBy: options.generatedBy,
        parameters: JSON.stringify({ error: error.message })
      }
    })
    
    throw error
  }
}

export async function getImage(artifactId: string): Promise<Buffer | null> {
  const { getArtifact } = await import('./storage')
  return getArtifact(artifactId, 'PNG')
}
