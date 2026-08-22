// Marketing pipeline E2E: generate draft (caption + media) → post now →
// schedule → verify the scheduler auto-publishes.
import { test } from '@playwright/test'
import { existsSync } from 'node:fs'

const AUTH_STATE = '.auth/state.json'
if (existsSync(AUTH_STATE)) test.use({ storageState: AUTH_STATE })

test('marketing draft → post now → schedule flow', async ({ request }) => {
  test.setTimeout(420000)

  // 1) GENERATE a carousel draft for Instagram
  const gen = await request.post('/api/marketing/automation/generate', {
    timeout: 360000,
    data: {
      type: 'social_post',
      instruction: 'Launch post for the Agni Red Sneaker — hand-stitched, limited to 200 pairs, ₹4,999, dropping this Friday at 7 PM IST on our site.',
      platforms: ['instagram'],
      format: 'carousel',
    },
  })
  const genBody = await gen.json()
  const task = genBody?.task
  console.log(`GEN  | HTTP ${gen.status()} | status=${task?.status} | media=${task?.mediaArtifactIds?.length} | hashtags=${task?.hashtags?.length}`)
  console.log(`CAPTION >>> ${(task?.content || genBody?.error || '').slice(0, 400).replace(/\n/g, ' · ')}`)
  console.log(`HASHTAGS >>> ${(task?.hashtags || []).join(' ').slice(0, 160)}`)

  // caption quality gates: emojis present, hashtags present, concrete subject
  const caption: string = task?.content || ''
  const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(caption)
  const hasSubject = /agni|red|sneaker/i.test(caption)
  const hasCta = /shop|comment|link|save|grab|drop|buy|book/i.test(caption)
  console.log(`QUALITY | emoji=${hasEmoji} subject=${hasSubject} cta=${hasCta} hashtags=${(task?.hashtags?.length || 0) >= 6}`)

  // media artifacts fetchable in-app
  for (const id of (task?.mediaArtifactIds || []).slice(0, 2)) {
    const img = await request.get(`/api/artifacts/${id}`)
    console.log(`MEDIA | ${id} → HTTP ${img.status()} ${img.headers()['content-type'] || ''} (${(await img.body()).length} bytes)`)
  }

  // 2) POST NOW — no OAuth account connected locally, so expect a recorded
  // per-platform failure (correct behavior), not a crash
  const pub = await request.post(`/api/marketing/automation/${task.id}/publish`, { timeout: 120000 })
  const pubBody = await pub.json()
  console.log(`PUBLISH-NOW | HTTP ${pub.status()} | published=${pubBody?.published} | results=${JSON.stringify(pubBody?.results || pubBody?.error).slice(0, 200)}`)

  // 3) SCHEDULE a second draft +65s out, then confirm the in-process
  // scheduler auto-publishes it when due
  const gen2 = await request.post('/api/marketing/automation/generate', {
    timeout: 360000,
    data: {
      type: 'social_post',
      instruction: 'Teaser for the Agni Red Sneaker drop this Friday 7 PM — 200 pairs only.',
      platforms: ['instagram', 'linkedin'],
      format: 'image',
    },
  })
  const task2 = (await gen2.json())?.task
  console.log(`GEN2 | HTTP ${gen2.status()} | status=${task2?.status} | media=${task2?.mediaArtifactIds?.length}`)

  const scheduledFor = new Date(Date.now() + 65 * 1000).toISOString()
  const sched = await request.post(`/api/marketing/automation/${task2.id}/schedule`, {
    data: { scheduledAt: scheduledFor },
  })
  const schedBody = await sched.json()
  console.log(`SCHEDULE | HTTP ${sched.status()} | task status=${schedBody?.task?.status} | at=${schedBody?.task?.scheduledAt}`)

  // wait past the due time + scheduler interval (60s) and check auto-publish
  await new Promise((r) => setTimeout(r, 145 * 1000))
  const list = await request.get('/api/marketing/automation')
  const tasks = (await list.json())?.tasks || []
  const after = tasks.find((t: any) => t.id === task2.id)
  console.log(`AUTO-PUBLISH | status=${after?.status} | publishedAt=${after?.publishedAt || 'none'} | results=${JSON.stringify(after?.publishResults || []).slice(0, 220)}`)
})
