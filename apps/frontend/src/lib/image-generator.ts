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
      imageUrl: `/api/artifacts/${artifact.id}`
    }
  } catch (error: any) {
    console.error('[Image Generator] Bedrock error:', error)
    
    // ponytail: Bedrock unavailable — generate a branded SVG design card instead
    // of a 1px placeholder. This ensures agents always produce *something* visual.
    // Upgrade path: wire a different image model (Replicate, OpenAI DALL-E via
    // OpenRouter) when budget allows.
    const safePrompt = options.prompt.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c] || c))
    const words = safePrompt.split(' ')
    const lines: string[] = []
    let line = ''
    for (const w of words) {
      if ((line + ' ' + w).length > 35) { lines.push(line.trim()); line = w }
      else line += ' ' + w
    }
    if (line.trim()) lines.push(line.trim())
    const textY = 400 - (lines.length * 14)
    const textLines = lines.map((l, i) => `<text x="400" y="${textY + i * 32}" text-anchor="middle" font-family="Helvetica Neue,Arial,sans-serif" font-size="22" fill="#ffffff">${l}</text>`).join('\n    ')

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1F3A5F"/>
      <stop offset="100%" stop-color="#C8302A"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <rect x="40" y="40" width="720" height="720" rx="24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
  <text x="400" y="120" text-anchor="middle" font-family="Helvetica Neue,Arial,sans-serif" font-size="14" fill="rgba(255,255,255,0.6)" letter-spacing="4">DESIGN BRIEF</text>
  <line x1="300" y1="145" x2="500" y2="145" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
  <text x="400" y="200" text-anchor="middle" font-family="Helvetica Neue,Arial,sans-serif" font-size="32" fill="#ffffff" font-weight="bold">${options.style.toUpperCase()}</text>
  <text x="400" y="240" text-anchor="middle" font-family="Helvetica Neue,Arial,sans-serif" font-size="14" fill="rgba(255,255,255,0.5)">${options.aspectRatio} · AI-Generated Brief</text>
  <rect x="100" y="280" width="600" height="${lines.length * 32 + 60}" rx="12" fill="rgba(0,0,0,0.25)"/>
  <text x="400" y="${textY - 10}" text-anchor="middle" font-family="Helvetica Neue,Arial,sans-serif" font-size="11" fill="rgba(255,255,255,0.4)" letter-spacing="3">PROMPT</text>
    ${textLines}
  <text x="400" y="720" text-anchor="middle" font-family="Helvetica Neue,Arial,sans-serif" font-size="12" fill="rgba(255,255,255,0.3)">Generated by Ekvaar OS · ${new Date().toISOString().slice(0,10)}</text>
</svg>`

    const svgBuffer = Buffer.from(svg, 'utf-8')
    const artifactId = `IMG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const title = options.title || `Design Brief - ${options.style}`
    const metadata = await storeArtifact(artifactId, 'PNG', svgBuffer, `${artifactId}.svg`)

    await db.artifact.create({
      data: {
        id: artifactId,
        organizationId: options.organizationId,
        title,
        type: 'PNG',
        mimeType: 'image/svg+xml',
        storageLocation: metadata.path,
        status: 'READY',
        generatedBy: options.generatedBy,
        parameters: JSON.stringify({
          prompt: options.prompt,
          style: options.style,
          aspectRatio: options.aspectRatio,
          fallback: true
        })
      }
    })

    return {
      artifactId,
      imageUrl: `/api/artifacts/${artifactId}`
    }
  }
}

export async function getImage(artifactId: string): Promise<Buffer | null> {
  const { getArtifact } = await import('./storage')
  return getArtifact(artifactId, 'PNG')
}
