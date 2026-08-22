export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { sanitizeInput } from '@/lib/security'
import { routeObject } from '@/lib/ai-router'
import { generateImage } from '@/lib/image-generator'
import { generateVideo } from '@/lib/video-generator'
import { z } from 'zod'

const GenerateSchema = z.object({
  type: z.enum(['social_post', 'content_calendar', 'email_campaign', 'ad_copy', 'blog_post']),
  instruction: z.string().min(10).max(3000),
  platforms: z.array(z.string()).min(1),
  format: z.enum(['image', 'carousel', 'reel', 'story', 'none']).default('image'),
})

const ContentSchema = z.object({
  content: z.string().describe('The caption/post text with emojis and a clear subject'),
  title: z.string().describe('Catchy title for the content'),
  hashtags: z.array(z.string()).optional(),
  image_prompts: z.array(z.string()).optional().describe('Concrete visual descriptions, one per slide/image, for generating the media'),
  scheduledAt: z.string().optional(),
})

const SYSTEM_PROMPT = `You are the CMO (Chief Marketing Officer) of a fashion brand writing REAL social content — never generic AI filler.

Caption rules (non-negotiable):
- Open with a clear subject line naming the exact product, drop, or topic
- Use emojis naturally throughout the caption (4-8, matched to the content: 🔥✨👟👗🧵🛍️📅💬)
- Include concrete specifics from the instruction: colors, materials, price/offer, dates, place
- End with a real CTA (shop now / comment below / save this post / link in bio)
- BANNED phrases: "elevate your style", "game-changer", "unleash", "dive in", "in today's fast-paced world", and any vague filler. Concrete nouns and real details only.
- hashtags: 8-12 relevant tags mixing broad and niche (brand + product + audience)

Media rules:
- image_prompts: one visual description per image to generate. For a carousel give 3-4 slides that tell a progression (product → detail → styling → offer). Each prompt: named subject, setting, lighting, mood. No vague "beautiful aesthetic" prompts.

Output ONLY the JSON object matching the schema. No prose.`

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const { type, instruction, platforms, format } = GenerateSchema.parse(body)

    // Get brand context
    const brandSettings = await db.systemSetting.findUnique({ where: { id: 'global' } })
    const brandVoice = (brandSettings as any)?.brandVoice || 'Sophisticated, authentic, culturally aware fashion brand'

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
        format,
      },
    })

    // Generate content using AI
    const { object } = await routeObject<z.infer<typeof ContentSchema>>('default', auth.organizationId, {
      schema: ContentSchema,
      system: `${SYSTEM_PROMPT}\n\nBrand Voice: ${brandVoice}\nPlatforms: ${platforms.join(', ')}\nContent Type: ${type}\nMedia Format: ${format}`,
      prompt: `Generate ${type} content for platforms: ${platforms.join(', ')} with a ${format} media format.\n\nInstruction: ${instruction}\n\nOutput only the JSON object with: content (full caption with emojis + CTA), title, hashtags (8-12), image_prompts (per-slide visual descriptions${format === 'carousel' ? ', 3-4 slides with progression' : format === 'reel' ? ', 3 scene stills for a vertical reel' : format === 'none' ? ' — omit' : ', exactly 1'}), and optional scheduledAt (ISO string).`,
      temperature: 0.8,
      maxOutputTokens: 2500,
    })

    // Generate media for visual formats
    const mediaArtifactIds: string[] = []
    const imagePrompts = (object.image_prompts || []).slice(0, 4)
    try {
      if (format === 'carousel') {
        const prompts = imagePrompts.length >= 2 ? imagePrompts : [`${object.title} — hero shot`, `${object.title} — detail shot`, `${object.title} — styled look`]
        for (let i = 0; i < prompts.length; i++) {
          const img = await generateImage({
            prompt: prompts[i],
            aspectRatio: '1:1',
            style: 'lifestyle',
            organizationId: auth.organizationId,
            generatedBy: 'CMO',
            title: `${object.title} — slide ${i + 1}`,
          })
          mediaArtifactIds.push(img.artifactId)
        }
      } else if (format === 'image') {
        const prompt = imagePrompts[0] || `${object.title} — ${instruction.slice(0, 120)}`
        const img = await generateImage({
          prompt,
          aspectRatio: '1:1',
          style: 'lifestyle',
          organizationId: auth.organizationId,
          generatedBy: 'CMO',
          title: object.title,
        })
        mediaArtifactIds.push(img.artifactId)
      } else if (format === 'story') {
        const prompt = imagePrompts[0] || `${object.title} — vertical story frame`
        const img = await generateImage({
          prompt,
          aspectRatio: '9:16',
          style: 'lifestyle',
          organizationId: auth.organizationId,
          generatedBy: 'CMO',
          title: object.title,
        })
        mediaArtifactIds.push(img.artifactId)
      } else if (format === 'reel') {
        const scenes = imagePrompts.length >= 2 ? imagePrompts : [`${object.title} — opening look`, `${object.title} — detail`, `${object.title} — closing offer`]
        const stills: Array<{ imagePath: string }> = []
        for (let i = 0; i < scenes.length; i++) {
          const img = await generateImage({
            prompt: scenes[i],
            aspectRatio: '9:16',
            style: 'lifestyle',
            organizationId: auth.organizationId,
            generatedBy: 'CMO',
            title: `${object.title} — scene ${i + 1}`,
          })
          const artifact = await db.artifact.findUnique({ where: { id: img.artifactId }, select: { storageLocation: true } })
          if (artifact?.storageLocation) stills.push({ imagePath: artifact.storageLocation })
        }
        if (stills.length > 0) {
          const vid = await generateVideo({
            template: 'InstagramReel',
            data: { tagline: object.title },
            duration: Math.min(15, Math.max(6, stills.length * 4)),
            organizationId: auth.organizationId,
            generatedBy: 'CMO',
            title: `${object.title} — reel`,
            scenes: stills as any,
          })
          mediaArtifactIds.push(vid.artifactId)
        }
      }
    } catch (mediaError: any) {
      console.warn('[Marketing Generate] media generation degraded:', mediaError?.message)
    }

    // Update task with generated content + media
    const updated = await db.marketingTask.update({
      where: { id: task.id },
      data: {
        status: 'READY',
        content: object.content,
        title: object.title,
        hashtags: object.hashtags || [],
        scheduledAt: object.scheduledAt ? new Date(object.scheduledAt) : null,
        mediaArtifactIds,
      },
    })

    // Log event
    await db.event.create({
      data: {
        organizationId: auth.organizationId,
        type: 'MARKETING_CONTENT_GENERATED',
        actorName: 'CMO (AI)',
        summary: `Generated ${type} (${format}, ${mediaArtifactIds.length} media) for ${platforms.join(', ')}: ${object.title}`,
        payload: JSON.stringify({ taskId: task.id, type, platforms, title: object.title, mediaArtifactIds }),
        severity: 'INFO',
      },
    })

    return NextResponse.json({ task: updated })
  } catch (error: any) {
    console.error('[Marketing Generate] Error:', error)
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 })
  }
}
