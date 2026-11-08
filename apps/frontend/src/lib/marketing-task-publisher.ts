// Publishes MarketingTask drafts to connected social accounts (Instagram,
// Facebook, Threads, LinkedIn) via the same Graph API publisher the campaign
// flow uses, and runs the scheduler that publishes SCHEDULED tasks when due.
import { db } from './db'
import { publishEntry } from './social-publisher'
import { publicArtifactUrl } from './artifact-public'
import { withSchedulerLock } from './scheduler-lock'

type ContentEntry = Record<string, any>

const PLATFORM_MAP: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  threads: 'Threads',
  linkedin: 'LinkedIn',
}

// Absolute public base for media URLs — platform APIs fetch media from here.
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')

export async function publishMarketingTask(task: {
  id: string
  organizationId: string
  content: string | null
  hashtags: string[]
  platforms: string[]
  format: string | null
  mediaArtifactIds: string[]
}) {
  const approved = await db.marketingTask.findFirst({
    where: { id: task.id, organizationId: task.organizationId, approvedAt: { not: null }, status: { in: ['APPROVED', 'SCHEDULED'] } },
  })
  if (!approved) throw new Error('Founder approval is required before publishing')
  task = approved
  const caption = [task.content || '', (task.hashtags || []).join(' ')].filter(Boolean).join('\n\n')
  const mediaUrls = (task.mediaArtifactIds || []).map((id) => publicArtifactUrl(PUBLIC_BASE_URL, id))
  const format = task.format === 'reel' || task.format === 'video' ? 'reel' : 'image'

  const results: string[] = []
  let anySuccess = false
  for (const platformId of task.platforms) {
    const platform = PLATFORM_MAP[platformId?.toLowerCase?.() ?? platformId]
    if (!platform) {
      results.push(`${platformId}: skipped (no direct publisher for this platform)`)
      continue
    }
    const entry: ContentEntry = {
      platform,
      caption,
      format,
      asset_brief: task.content?.slice(0, 80),
      ...(mediaUrls.length > 1
        ? { carousel_urls: mediaUrls, media_url: mediaUrls[0] }
        : mediaUrls.length === 1
          ? { media_url: mediaUrls[0] }
          : {}),
    }
    try {
      const receipt: any = await publishEntry(task.organizationId, entry)
      results.push(`${platform}: published (${String(receipt?.id || '')})`)
      anySuccess = true
    } catch (error: any) {
      results.push(`${platform}: failed — ${error?.message || 'unknown error'}`)
    }
  }

  const updated = await db.marketingTask.update({
    where: { id: task.id },
    data: {
      status: anySuccess ? 'PUBLISHED' : 'READY',
      publishedAt: anySuccess ? new Date() : null,
      publishResults: results,
    },
  })
  await db.event.create({
    data: {
      organizationId: task.organizationId,
      type: anySuccess ? 'MARKETING_CONTENT_PUBLISHED' : 'MARKETING_PUBLISH_FAILED',
      actorName: 'Founder',
      summary: `${anySuccess ? 'Published' : 'Failed to publish'} marketing task ${task.id}`,
      payload: JSON.stringify({ taskId: task.id, results }),
      severity: anySuccess ? 'INFO' : 'WARN',
    },
  }).catch(() => {})
  return { task: updated, results, anySuccess }
}

export type MarketingPublishOutcome = {
  task: { id: string; status: string; publishedAt: Date | null }
  results: string[]
  anySuccess: boolean
}

export async function publishDueMarketingTasks(): Promise<MarketingPublishOutcome[]> {
  const outcomes: MarketingPublishOutcome[] = []
  await withSchedulerLock('marketing', async () => {
  const due = await db.marketingTask.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
    take: 10,
  })
  for (const task of due) outcomes.push(await publishMarketingTask(task))
  })
  return outcomes
}

// In-process scheduler: publishes due SCHEDULED tasks every 60s so local/dev
// deployments work without an external cron. External cron can also hit
// /api/cron/publish-marketing. Both use the same shared Redis lease.
const globalForScheduler = globalThis as unknown as { marketingPublishTimer?: NodeJS.Timeout }
// Skipped on Vercel: serverless timers don't persist; Vercel Cron calls the route.
if (!process.env.VERCEL && !globalForScheduler.marketingPublishTimer) {
  globalForScheduler.marketingPublishTimer = setInterval(() => {
    publishDueMarketingTasks().catch(error => console.error('[marketing scheduler]', error))
  }, 60 * 1000)
}
