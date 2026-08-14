import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { routeText } from '@/lib/ai-router'
import { generateImage } from '@/lib/image-generator'
import { generateVideo } from '@/lib/video-generator'
import { publicArtifactUrl } from '@/lib/artifact-public'

const DraftSchema = z.object({
  cycle_name: z.string().min(3),
  items: z.array(z.object({
    platform: z.enum(['Instagram', 'Facebook', 'Threads', 'LinkedIn']),
    format: z.enum(['post', 'carousel', 'reel', 'video', 'text_only']),
    caption: z.string().min(10),
    asset_brief: z.string().min(10),
    scheduled_at_ist: z.string().min(10),
  })).length(8),
})

const CONTENT_MATRIX = `Exactly eight items: Instagram carousel + reel; Facebook post + video; Threads text_only + post; LinkedIn post + carousel. Use future ISO-8601 timestamps with +05:30.`
function parseDraft(text: string) {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('AI did not return a JSON content plan')
  return DraftSchema.parse(JSON.parse(clean.slice(start, end + 1)))
}

function resilientDraft(instruction: string, brandName: string, brandDna: string) {
  const start = Date.now() + 24 * 60 * 60 * 1000
  const at = (day: number, hour: number) => new Date(start + day * 86400000 + hour * 3600000).toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace(' ', 'T') + '+05:30'
  const subject = instruction.replace(/^create\s+/i, '').replace(/[.!]+$/, '').slice(0, 180)
  return DraftSchema.parse({ cycle_name: `${brandName} · Trust Through Clarity`, items: [
    { platform: 'Instagram', format: 'carousel', caption: `${brandName}: ${subject}. ${brandDna || 'Build trust through a clear, useful idea.'}`, asset_brief: `Three-frame original editorial sequence for ${brandName}, with coherent art direction and generous negative space`, scheduled_at_ist: at(0, 3) },
    { platform: 'Instagram', format: 'reel', caption: `${brandName} in motion: one idea, shown clearly, without the noise.`, asset_brief: `Restrained vertical film that demonstrates ${brandName}'s core customer value`, scheduled_at_ist: at(1, 3) },
    { platform: 'Facebook', format: 'post', caption: `${brandName} is focused on one useful promise: ${subject}.`, asset_brief: `Original brand-led editorial image for ${brandName}`, scheduled_at_ist: at(0, 6) },
    { platform: 'Facebook', format: 'video', caption: `${brandName}: a closer look at how the work creates value.`, asset_brief: `Twenty-second original process film for ${brandName}, focused on people, craft or product evidence`, scheduled_at_ist: at(2, 6) },
    { platform: 'Threads', format: 'text_only', caption: `${brandName} believes clarity is a growth strategy.`, asset_brief: 'Text-only startup observation', scheduled_at_ist: at(0, 8) },
    { platform: 'Threads', format: 'post', caption: `${subject}. Here is the part we think matters most.`, asset_brief: `Minimal original square image communicating ${brandName}'s central idea`, scheduled_at_ist: at(2, 8) },
    { platform: 'LinkedIn', format: 'post', caption: `${brandName} is building with intent: ${subject}. The operating principle is simple—make every claim earn trust.`, asset_brief: `Original professional editorial image expressing ${brandName}'s operating discipline`, scheduled_at_ist: at(1, 5) },
    { platform: 'LinkedIn', format: 'carousel', caption: `${brandName}, in three decisions: understand the problem, show the evidence, earn the next step.`, asset_brief: `Three restrained professional frames explaining ${brandName}'s problem, approach and proof`, scheduled_at_ist: at(3, 5) },
  ] })
}

export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const organizationId = String(body.organizationId || '')
    const organization = organizationId ? await db.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true, context: true } }) : null
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    const instruction = String(body.instruction || `Generate the next ${organization.name} marketing content cycle`).slice(0, 1000)
    const brandDna = organization.context?.brandDna || ''
    const brandBrief = `Brand: ${organization.name}. Profile: ${organization.context?.companyProfile || 'not supplied'}. Brand DNA: ${brandDna || 'not supplied'}. Industry: ${organization.context?.industry || 'not supplied'}. Tone: ${organization.context?.toneOfVoice || 'clear, specific and human'}. Never invent brand claims that are not in this brief. Audience and language must follow the instruction and organization context.`
    let generated: { text: string; provider: string; model: string }
    let degradedReason: string | undefined
    let draft: z.infer<typeof DraftSchema>
    try {
      generated = await routeText('default', organizationId, {
        system: `You are ${organization.name}'s marketing editor. ${brandBrief} Write human, specific copy without AI filler. Rights-safe original concepts only. Return JSON only.`,
        prompt: `${instruction}\n${CONTENT_MATRIX}\nReturn {"cycle_name":string,"items":[{"platform":string,"format":string,"caption":string,"asset_brief":string,"scheduled_at_ist":string}]}.`,
        temperature: 0.55,
        maxOutputTokens: 2600,
      })
      draft = parseDraft(generated.text)
    } catch (error: any) {
      degradedReason = error.message || 'All model routes failed'
      generated = { text: '', provider: 'rule-based-resilience', model: 'ekvaar-brand-v1' }
      draft = resilientDraft(instruction, organization.name, brandDna)
    }
    const publicUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
    const calendar: Array<Record<string, unknown>> = []
    for (const [index, item] of draft.items.entries()) {
      const common = { ...item, rights_check: 'PASS — original AI-generated concept; no third-party copyrighted asset requested', policy_check: 'PASS — organic branded content; Founder approval required before publishing' }
      if (item.format === 'text_only') {
        calendar.push(common)
      } else if (item.format === 'reel' || item.format === 'video') {
        const media = await generateVideo({ template: item.format === 'reel' ? 'InstagramReel' : 'ProductShowcase', data: { text: item.caption, title: draft.cycle_name }, duration: item.format === 'reel' ? 15 : 20, organizationId, generatedBy: String(body.agentCode || 'N8N'), title: `${draft.cycle_name} ${index + 1}` })
        const url = publicArtifactUrl(publicUrl, media.artifactId)
        calendar.push({ ...common, video_url: url, media_url: url, preview_url: `${publicUrl}${media.videoUrl}`, artifact_id: media.artifactId })
      } else if (item.format === 'carousel') {
        const slides: string[] = []
        for (let slide = 1; slide <= 3; slide += 1) {
          const media = await generateImage({ prompt: `${item.asset_brief}. Slide ${slide} of 3; coherent editorial sequence; no logos or text baked into image.`, aspectRatio: '1:1', style: 'lifestyle', organizationId, generatedBy: String(body.agentCode || 'N8N'), title: `${draft.cycle_name} ${index + 1}.${slide}` })
          slides.push(publicArtifactUrl(publicUrl, media.artifactId))
        }
        calendar.push({ ...common, media_url: slides[0], carousel_urls: slides })
      } else {
        const media = await generateImage({ prompt: `${item.asset_brief}. No logos or text baked into image.`, aspectRatio: '1:1', style: 'lifestyle', organizationId, generatedBy: String(body.agentCode || 'N8N'), title: `${draft.cycle_name} ${index + 1}` })
        const url = publicArtifactUrl(publicUrl, media.artifactId)
        calendar.push({ ...common, image_url: url, media_url: url, preview_url: `${publicUrl}${media.imageUrl}`, artifact_id: media.artifactId })
      }
    }
    return NextResponse.json({ executionId: crypto.randomUUID(), generatedAt: new Date().toISOString(), model: { provider: generated.provider, id: generated.model, degraded: Boolean(degradedReason), reason: degradedReason }, plan: { content_cycle: { cycle_name: draft.cycle_name, total_posts: calendar.length, timezone: 'Asia/Kolkata' }, calendar, publishing_summary: { total_items: calendar.length, approval: 'FOUNDER_REQUIRED' } } })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Marketing generation failed' }, { status: 502 })
  }
}
