export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'
import { publishInstagramEntry } from '@/lib/social-publisher'

const schema = z.object({
  artifactId: z.string().optional(),
  artifactIds: z.array(z.string()).optional(),
  mediaUrl: z.string().url().optional(),
  caption: z.string().max(2200).optional(),
  format: z.enum(['image', 'reel', 'story']).optional(),
})

// One-click Instagram publish: artifact (or direct URL) → Graph API container
// → media_publish, reusing the scheduled campaign publisher verbatim.
export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid request' }, { status: 400 })
  const { artifactId, artifactIds, mediaUrl, caption = '', format = 'image' } = parsed.data

  try {
    // ponytail: ceiling — /api/artifacts/:id is auth-gated, so Meta's servers
    // can only fetch it when a caller passes a public mediaUrl or the org's
    // artifact store is exposed publicly. Upgrade path: signed public URLs.
    const base = new URL(req.url).origin
    const resolve = async (id: string) => {
      const artifact = await db.artifact.findFirst({ where: { id, organizationId: auth.organizationId } })
      if (!artifact) throw new Error(`Artifact ${id} not found`)
      return `${base}/api/artifacts/${artifact.id}`
    }

    const carouselUrls = artifactIds && artifactIds.length > 1 ? await Promise.all(artifactIds.map(resolve)) : undefined
    const url = mediaUrl || (artifactId ? await resolve(artifactId) : carouselUrls?.[0])
    if (!url) return NextResponse.json({ error: 'Provide artifactId, artifactIds, or mediaUrl' }, { status: 400 })

    // Idempotency: an identical artifact+format publish already confirmed is
    // returned instead of re-posted (double-click safety).
    const dedupeKey = `${artifactId || artifactIds?.join(',') || url}:${format}`
    const prior = await db.event.findFirst({
      where: { organizationId: auth.organizationId, type: 'INSTAGRAM_PUBLISHED', payload: { contains: dedupeKey } },
      orderBy: { timestamp: 'desc' },
    })
    if (prior) return NextResponse.json({ status: 'ALREADY_PUBLISHED', receipt: JSON.parse(prior.payload || '{}') })

    const entryFormat = format === 'story' ? 'reel' : format // stories publish as REELS containers
    const receipt: any = await publishInstagramEntry(auth.organizationId, {
      format: entryFormat,
      media_url: url,
      carousel_urls: carouselUrls,
      caption,
    })

    await db.event.create({
      data: {
        organizationId: auth.organizationId,
        type: 'INSTAGRAM_PUBLISHED',
        actorName: 'Founder',
        summary: `Published to Instagram (${format})`,
        payload: JSON.stringify({ key: dedupeKey, postId: receipt?.id || null }),
        severity: 'INFO',
      },
    })

    return NextResponse.json({ status: 'PUBLISHED', receipt })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Instagram publish failed' }, { status: 502 })
  }
}
