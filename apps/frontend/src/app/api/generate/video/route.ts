export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { createApiResponse, createApiError } from '@/lib/security'
import { requireOrganization } from '@/lib/auth-guard'
import { z } from 'zod'
import { generateVideo } from '@/lib/video-generator'

const VideoGenerationSchema = z.object({
  template: z.string(),
  data: z.record(z.any()),
  duration: z.number().min(1).max(120).default(15),
  title: z.string().optional()
})

export async function POST(req: NextRequest) {
  const authResult = await requireOrganization()
  if (!authResult.success) return authResult.response
  
  try {
    const body = await req.json()
    const validated = VideoGenerationSchema.parse(body)
    
    const result = await generateVideo({
      template: validated.template,
      data: validated.data,
      duration: validated.duration,
      organizationId: authResult.organizationId,
      generatedBy: 'FOUNDER',
      title: validated.title
    })
    
    return createApiResponse({
      success: true,
      artifactId: result.artifactId,
      videoUrl: result.videoUrl
    })
  } catch (error: any) {
    console.error('[Video API] Error:', error)
    if (error instanceof z.ZodError) {
      return createApiError('Invalid request format', 400)
    }
    return createApiError(error.message || 'Video generation failed', 500)
  }
}
