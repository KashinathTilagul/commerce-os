// Generation smoke test: agent doc deliverable, image artifact, video artifact.
// Run: npx playwright test e2e/inspect-generations.spec.ts --project=chromium
import { test } from '@playwright/test'

const AGENT_ID = 'cmsgybmcs005m6a3d5jzy6plv' // Diya — has BACKLOG research issue

test('doc, image, video generation', async ({ page }) => {
  test.setTimeout(420000)
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Username' }).fill('test@gmail.com')
  await page.getByRole('textbox', { name: 'Password' }).fill('EkvaarTest!2026')
  await page.getByRole('button', { name: 'Sign in' }).click()
  try {
    await page.waitForURL('/', { timeout: 10000 })
  } catch {
    await page.goto('/')
  }
  await page.waitForTimeout(2000)

  // 1) DOC — run an agent on its open ticket; deliverable comes from the LLM
  try {
    const res = await page.request.post(`/api/agents/${AGENT_ID}/work`, { timeout: 300000 })
    const body = await res.json()
    console.log(`DOC  | HTTP ${res.status()} | ok=${body.ok} | message=${String(body.message).slice(0, 80)}`)
  } catch (e: any) {
    console.log(`DOC  | FAIL | ${String(e.message).slice(0, 120)}`)
  }

  // 2) IMAGE
  try {
    const res = await page.request.post('/api/generate/image', {
      timeout: 300000,
      data: {
        prompt: 'minimalist red sneaker on white studio background',
        style: 'product',
        aspectRatio: '1:1',
        title: 'Inspection Image Test',
      },
    })
    const body = await res.json()
    const artifactId = body?.data?.artifactId || body?.artifactId
    const imageUrl = body?.data?.imageUrl || body?.imageUrl
    let kind = 'n/a'
    if (imageUrl) {
      const img = await page.request.get(imageUrl)
      kind = `${img.status()} ${(img.headers()['content-type'] || '')} (${(await img.body()).length} bytes)`
    }
    console.log(`IMG  | HTTP ${res.status()} | artifact=${artifactId} | fetch=${kind} | err=${body?.error || 'none'}`)
  } catch (e: any) {
    console.log(`IMG  | FAIL | ${String(e.message).slice(0, 120)}`)
  }

  // 3) VIDEO — legacy title-card path (local ffmpeg + sharp)
  try {
    const res = await page.request.post('/api/generate/video', {
      timeout: 300000,
      data: {
        template: 'BrandVideo',
        data: { text: 'EKVAAR — Ship outcomes.' },
        duration: 4,
        title: 'Inspection Video Test',
      },
    })
    const body = await res.json()
    const artifactId = body?.data?.artifactId || body?.artifactId
    const videoUrl = body?.data?.videoUrl || body?.videoUrl
    let kind = 'n/a'
    if (videoUrl) {
      const vid = await page.request.get(videoUrl)
      kind = `${vid.status()} ${(vid.headers()['content-type'] || '')} (${(await vid.body()).length} bytes)`
    }
    console.log(`VID  | HTTP ${res.status()} | artifact=${artifactId} | fetch=${kind} | err=${body?.error || 'none'}`)
  } catch (e: any) {
    console.log(`VID  | FAIL | ${String(e.message).slice(0, 120)}`)
  }
})
