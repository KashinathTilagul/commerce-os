export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { createApiResponse, createApiError } from '@/lib/security'
import { requireOrganization } from '@/lib/auth-guard'
import { z } from 'zod'
import { generateImage } from '@/lib/image-generator'

const ImageGenerationSchema = z.object({
  prompt: z.string().min(5).max(2000),
  aspectRatio: z.enum(['1:1', '16:9', '9:16']).default('1:1'),
  style: z.enum(['product', 'lifestyle', 'abstract']).default('product'),
  title: z.string().optional()
})

export async function POST(req: NextRequest) {
  const authResult = await requireOrganization()
  if (!authResult.success) return authResult.response
  
  try {
    const body = await req.json()
    const validated = ImageGenerationSchema.parse(body)
    
    const result = await generateImage({
      prompt: validated.prompt,
      aspectRatio: validated.aspectRatio,
      style: validated.style,
      organizationId: authResult.organizationId,
      generatedBy: 'FOUNDER',
      title: validated.title
    })
    
    return createApiResponse({
      success: true,
      artifactId: result.artifactId,
      imageUrl: result.imageUrl
    })
  } catch (error: any) {
    console.error('[Image API] Error:', error)
    if (error instanceof z.ZodError) {
      return createApiError('Invalid request format', 400)
    }
    return createApiError(error.message || 'Image generation failed', 500)
  }
}
