import { createHash } from 'node:crypto'
import { db } from './db'
import { getOAuthToken } from './oauth'

type ContentEntry = Record<string, any>
const graphVersion = process.env.META_GRAPH_VERSION || 'v25.0'
const graphBase = `https://graph.facebook.com/${graphVersion}`

async function jsonFetch(url: string, init: RequestInit = {}) {
  const response = await fetch(url, init)
  const text = await response.text()
  let body: any
  try { body = text ? JSON.parse(text) : {} } catch { body = { raw: text } }
  if (!response.ok) throw new Error(body?.error?.message || body?.message || `${response.status} ${response.statusText}`)
  return { body, response }
}

function form(fields: Record<string, string>) {
  return new URLSearchParams(Object.entries(fields).filter(([, value]) => Boolean(value)))
}

async function publishFacebook(organizationId: string, entry: ContentEntry) {
  const token = await getOAuthToken(organizationId, 'meta')
  if (!token?.accountId) throw new Error('Facebook Page is not connected or selected')
  const media = entry.media_url || entry.image_url || entry.video_url
  const isVideo = entry.format === 'video' || entry.format === 'reel'
  const endpoint = isVideo ? 'videos' : media ? 'photos' : 'feed'
  const fields: Record<string, string> = { access_token: token.accessToken, message: entry.caption || '' }
  if (isVideo) { fields.file_url = media; fields.description = entry.caption || '' }
  else if (media) { fields.url = media; fields.caption = entry.caption || '' }
  return (await jsonFetch(`${graphBase}/${token.accountId}/${endpoint}`, { method: 'POST', body: form(fields) })).body
}

async function instagramContainer(accountId: string, accessToken: string, fields: Record<string, string>) {
  return (await jsonFetch(`${graphBase}/${accountId}/media`, { method: 'POST', body: form({ ...fields, access_token: accessToken }) })).body.id as string
}

async function publishInstagram(organizationId: string, entry: ContentEntry) {
  const token = await getOAuthToken(organizationId, 'instagram')
  if (!token?.accountId) throw new Error('Instagram professional account is not connected')
  let creationId: string
  if (Array.isArray(entry.carousel_urls) && entry.carousel_urls.length > 1) {
    const children: string[] = []
    for (const imageUrl of entry.carousel_urls) children.push(await instagramContainer(token.accountId, token.accessToken, { image_url: imageUrl, is_carousel_item: 'true' }))
    creationId = await instagramContainer(token.accountId, token.accessToken, { media_type: 'CAROUSEL', children: children.join(','), caption: entry.caption || '' })
  } else if (entry.format === 'reel' || entry.format === 'video') {
    creationId = await instagramContainer(token.accountId, token.accessToken, { media_type: 'REELS', video_url: entry.media_url || entry.video_url, caption: entry.caption || '', share_to_feed: 'true' })
  } else {
    creationId = await instagramContainer(token.accountId, token.accessToken, { image_url: entry.media_url || entry.image_url, caption: entry.caption || '' })
  }
  return (await jsonFetch(`${graphBase}/${token.accountId}/media_publish`, { method: 'POST', body: form({ creation_id: creationId, access_token: token.accessToken }) })).body
}

async function publishThreads(organizationId: string, entry: ContentEntry) {
  const token = await getOAuthToken(organizationId, 'threads')
  if (!token) throw new Error('Threads account is not connected')
  const fields: Record<string, string> = { text: entry.caption || '', media_type: 'TEXT', access_token: token.accessToken }
  const media = entry.media_url || entry.image_url || entry.video_url
  if (media) {
    const video = entry.format === 'video' || entry.format === 'reel'
    fields.media_type = video ? 'VIDEO' : 'IMAGE'
    fields[video ? 'video_url' : 'image_url'] = media
  }
  const creation = (await jsonFetch(`https://graph.threads.net/${graphVersion}/me/threads`, { method: 'POST', body: form(fields) })).body.id
  return (await jsonFetch(`https://graph.threads.net/${graphVersion}/me/threads_publish`, { method: 'POST', body: form({ creation_id: creation, access_token: token.accessToken }) })).body
}

async function uploadLinkedInImage(accessToken: string, author: string, mediaUrl: string) {
  const headers = { Authorization: `Bearer ${accessToken}`, 'LinkedIn-Version': process.env.LINKEDIN_API_VERSION || '202606', 'X-Restli-Protocol-Version': '2.0.0', 'Content-Type': 'application/json' }
  const initialized = await jsonFetch('https://api.linkedin.com/rest/images?action=initializeUpload', { method: 'POST', headers, body: JSON.stringify({ initializeUploadRequest: { owner: author } }) })
  const value = initialized.body.value
  const media = await fetch(mediaUrl)
  if (!media.ok) throw new Error(`Unable to fetch generated LinkedIn media (${media.status})`)
  const upload = await fetch(value.uploadUrl, { method: 'PUT', headers: { Authorization: `Bearer ${accessToken}` }, body: await media.arrayBuffer() })
  if (!upload.ok) throw new Error(`LinkedIn media upload failed (${upload.status})`)
  return value.image as string
}

async function publishLinkedIn(organizationId: string, entry: ContentEntry) {
  const token = await getOAuthToken(organizationId, 'linkedin')
  if (!token?.accountId) throw new Error('LinkedIn account is not connected')
  const author = token.accountId.startsWith('urn:li:') ? token.accountId : `urn:li:person:${token.accountId}`
  const urls = Array.isArray(entry.carousel_urls) ? entry.carousel_urls : [entry.media_url || entry.image_url].filter(Boolean)
  const imageIds: string[] = []
  for (const url of urls) imageIds.push(await uploadLinkedInImage(token.accessToken, author, url))
  const content = imageIds.length > 1
    ? { multiImage: { images: imageIds.map((id) => ({ id, altText: entry.asset_brief || 'Ekvaar editorial image' })) } }
    : imageIds.length === 1 ? { media: { id: imageIds[0], title: entry.asset_brief || 'Ekvaar' } } : undefined
  const headers = { Authorization: `Bearer ${token.accessToken}`, 'LinkedIn-Version': process.env.LINKEDIN_API_VERSION || '202606', 'X-Restli-Protocol-Version': '2.0.0', 'Content-Type': 'application/json' }
  const post = await jsonFetch('https://api.linkedin.com/rest/posts', { method: 'POST', headers, body: JSON.stringify({ author, commentary: entry.caption || '', visibility: 'PUBLIC', distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] }, ...(content ? { content } : {}), lifecycleState: 'PUBLISHED', isReshareDisabledByAuthor: false }) })
  return { id: post.response.headers.get('x-restli-id'), body: post.body }
}

export async function publishEntry(organizationId: string, entry: ContentEntry) {
  if (entry.platform === 'Instagram') return publishInstagram(organizationId, entry)
  if (entry.platform === 'Facebook') return publishFacebook(organizationId, entry)
  if (entry.platform === 'Threads') return publishThreads(organizationId, entry)
  if (entry.platform === 'LinkedIn') return publishLinkedIn(organizationId, entry)
  throw new Error(`Unsupported platform: ${entry.platform}`)
}

// One-click Instagram publish — thin wrapper so routes reuse the exact same
// Graph API container/publish flow as the scheduled campaign publisher.
export function publishInstagramEntry(organizationId: string, entry: ContentEntry) {
  return publishInstagram(organizationId, { ...entry, platform: 'Instagram' })
}

export async function publishDueMarketing(organizationId?: string) {
  const revisions = await db.campaignRevision.findMany({
    where: { status: 'APPROVED', publishStatus: { in: ['READY', 'PUBLISHING', 'PARTIALLY_PUBLISHED'] }, ...(organizationId ? { launch: { organizationId } } : {}) },
    include: { launch: { include: { items: { orderBy: { orderNum: 'asc' } } } }, publishLogs: true },
  })
  const results: Array<Record<string, unknown>> = []
  for (const revision of revisions) {
    const evidence: any = revision.evidenceJson
    const calendar: ContentEntry[] = Array.isArray(evidence?.plan?.calendar) ? evidence.plan.calendar : []
    await db.campaignRevision.update({ where: { id: revision.id }, data: { publishStatus: 'PUBLISHING', publishStartedAt: revision.publishStartedAt || new Date() } })
    for (const [index, entry] of calendar.entries()) {
      const scheduled = new Date(entry.scheduled_at_ist)
      if (!Number.isNaN(scheduled.getTime()) && scheduled.getTime() > Date.now()) continue
      const item = revision.launch.items[index]
      const key = createHash('sha256').update(`${revision.versionHash}:${item?.id || index}:${entry.platform}`).digest('hex')
      const existing = revision.publishLogs.find((log) => log.idempotencyKey === key)
      if (existing?.status === 'CONFIRMED') continue
      const log = await db.campaignPublishLog.upsert({ where: { idempotencyKey: key }, update: { status: 'RUNNING', attemptCount: { increment: 1 }, startedAt: new Date(), error: null }, create: { revisionId: revision.id, itemId: item?.id, provider: entry.platform, action: 'PUBLISH', idempotencyKey: key, proofHash: revision.versionHash, status: 'RUNNING', attemptCount: 1, startedAt: new Date() } })
      try {
        const receipt: any = await publishEntry(revision.launch.organizationId, entry)
        await db.campaignPublishLog.update({ where: { id: log.id }, data: { status: 'CONFIRMED', providerId: String(receipt?.id || receipt?.post_id || receipt?.creation_id || ''), providerResponse: receipt, completedAt: new Date() } })
        results.push({ revisionId: revision.id, platform: entry.platform, status: 'CONFIRMED', providerId: receipt?.id || null })
      } catch (error: any) {
        await db.campaignPublishLog.update({ where: { id: log.id }, data: { status: 'FAILED', error: error.message || 'Publish failed', completedAt: new Date() } })
        results.push({ revisionId: revision.id, platform: entry.platform, status: 'FAILED', error: error.message || 'Publish failed' })
      }
    }
    const logs = await db.campaignPublishLog.findMany({ where: { revisionId: revision.id } })
    const confirmed = logs.filter((log) => log.status === 'CONFIRMED').length
    const due = calendar.filter((entry) => { const at = new Date(entry.scheduled_at_ist); return Number.isNaN(at.getTime()) || at.getTime() <= Date.now() }).length
    const final = confirmed === calendar.length ? 'PUBLISHED' : logs.some((log) => log.status === 'FAILED') ? 'PARTIALLY_PUBLISHED' : 'PUBLISHING'
    await db.$transaction([
      db.campaignRevision.update({ where: { id: revision.id }, data: { publishStatus: final, publishedAt: final === 'PUBLISHED' ? new Date() : undefined } }),
      db.campaignLaunch.update({ where: { id: revision.launchId }, data: { status: final, completedAt: final === 'PUBLISHED' ? new Date() : undefined } }),
    ])
    results.push({ revisionId: revision.id, confirmed, due, total: calendar.length, status: final })
  }
  return results
}
