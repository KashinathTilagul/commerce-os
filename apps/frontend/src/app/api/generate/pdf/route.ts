import { NextRequest } from 'next/server'
import { createApiResponse, createApiError } from '@/lib/security'
import { requireOrganization } from '@/lib/auth-guard'
import { z } from 'zod'
import { generatePDF } from '@/lib/pdf-generator'

const PDFGenerationSchema = z.object({
  template: z.string().default('report'),
  data: z.record(z.any()),
  title: z.string().min(1).max(200)
})

export async function POST(req: NextRequest) {
  const authResult = await requireOrganization()
  if (!authResult.success) return authResult.response
  
  try {
    const body = await req.json()
    const validated = PDFGenerationSchema.parse(body)
    
    const result = await generatePDF({
      template: validated.template,
      data: validated.data,
      title: validated.title,
      organizationId: authResult.organizationId,
      generatedBy: 'FOUNDER'
    })
    
    return createApiResponse({
      success: true,
      artifactId: result.artifactId,
      downloadUrl: result.downloadUrl
    })
  } catch (error: any) {
    console.error('[PDF API] Error:', error)
    if (error instanceof z.ZodError) {
      return createApiError('Invalid request format', 400)
    }
    return createApiError(error.message || 'PDF generation failed', 500)
  }
}
