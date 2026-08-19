export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { sanitizeInput } from '@/lib/security'
import { routeObject } from '@/lib/ai-router'
import { z } from 'zod'

const GenerateSchema = z.object({
  type: z.enum(['social_post', 'content_calendar', 'email_campaign', 'ad_copy', 'blog_post']),
  instruction: z.string().min(10).max(3000),
  platforms: z.array(z.string()).min(1),
})

const ContentSchema = z.object({
  content: z.string().describe('The generated marketing content'),
  title: z.string().describe('Catchy title for the content'),
  hashtags: z.array(z.string()).optional(),
  scheduledAt: z.string().optional(),
})

const SYSTEM_PROMPT = `You are the CMO (Chief Marketing Officer) of a fashion brand. Generate high-quality marketing content that:
- Matches the brand voice: sophisticated, authentic, culturally aware
- Is platform-appropriate (character limits, format, tone)
- Includes relevant hashtags
- Drives engagement and conversions
- Follows brand guidelines

Output ONLY the JSON object matching the schema. No prose.`

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const { type, instruction, platforms } = GenerateSchema.parse(body)

    // Get brand context
    const brandSettings = await db.systemSetting.findUnique({ where: { id: 'global' } })
    const brandVoice = brandSettings?.brandVoice || 'Sophisticated, authentic, culturally aware fashion brand'

    // Create marketing task record
    const taskCount = await db.marketingTask.count({ where: { organizationId: auth.organizationId } })
    const code = `MKT-${String(taskCount + 1).padStart(3, '0')}`

    const task = await db.marketingTask.create({
      data: {
        organizationId: auth.organizationId,
        code,
        type,
        title: instruction.slice(0, 80),
        instruction,
        status: 'GENERATING',
        platforms,
        platformDetails: platforms,
      },
    })

    // Generate content using AI
    const { object } = await routeObject<z.infer<typeof ContentSchema>>('default', {
      schema: ContentSchema,
      system: `${SYSTEM_PROMPT}\n\nBrand Voice: ${brandVoice}\nPlatforms: ${platforms.join(', ')}\nContent Type: ${type}`,
      prompt: `Generate ${type} content for platforms: ${platforms.join(', ')}.\n\nInstruction: ${instruction}\n\nOutput only the JSON object with: content (the full text), title, hashtags (array), and optional scheduledAt (ISO string).`,
      temperature: 0.8,
      maxOutputTokens: 2000,
    })

    // Update task with generated content
    const updated = await db.marketingTask.update({
      where: { id: task.id },
      data: {
        status: 'READY',
        content: object.content,
        title: object.title,
        hashtags: object.hashtags || [],
        scheduledAt: object.scheduledAt ? new Date(object.scheduledAt) : null,
      },
    })

    // Log event
    await db.event.create({
      data: {
        organizationId: auth.organizationId,
        type: 'MARKETING_CONTENT_GENERATED',
        actorName: 'CMO (AI)',
        summary: `Generated ${type} for ${platforms.join(', ')}: ${object.title}`,
        payload: JSON.stringify({ taskId: task.id, type, platforms, title: object.title }),
        severity: 'INFO',
      },
    })

    return NextResponse.json({ task: updated })
  } catch (error: any) {
    console.error('[Marketing Generate] Error:', error)
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 })
  }
}