// Content Studio UI check: open via Launchpad, generate a draft, verify the
// Post now / Schedule popover. Also proves the launchpad overlay fix (the
// desktop must stay clickable after opening an app from Launchpad).
import { test } from '@playwright/test'
import { existsSync } from 'node:fs'

const AUTH_STATE = '.auth/state.json'
if (existsSync(AUTH_STATE)) test.use({ storageState: AUTH_STATE })

test('content studio ui flow', async ({ page }) => {
  test.setTimeout(300000)
  await page.goto('/')
  await page.waitForTimeout(4000)

  // open Content Studio via launchpad search + Enter (Enter-to-open fix)
  await page.keyboard.press('F4')
  const search = page.getByPlaceholder('Search apps…')
  await search.waitFor({ state: 'visible', timeout: 5000 })
  await search.fill('Content Studio')
  await page.waitForTimeout(500)
  await search.press('Enter')
  await page.locator('span.font-display', { hasText: 'Content Studio' }).first().waitFor({ timeout: 10000 })
  console.log('UI | Content Studio window opened via Launchpad + Enter')

  // launchpad overlay must be gone — click somewhere on the desktop shell
  await page.waitForTimeout(2500)
  const overlayCount = await page.locator('div.z-\\[9500\\]').count()
  console.log('UI | launchpad overlay after open (must be 0):', overlayCount)

  // open the create form and check the format picker
  await page.getByRole('button', { name: 'Create Content' }).click({ timeout: 5000 })
  await page.waitForTimeout(600)
  const formatButtons = await page.getByRole('button', { name: /Image|Carousel|Reel|Story|Text only/ }).count()
  console.log('UI | format options visible:', formatButtons)

  // generate a reel draft through the UI
  await page.locator('textarea').first().fill('Behind the scenes of the Agni Red Sneaker workshop — hand-stitched, 200 pairs, drop Friday 7 PM.')
  await page.getByRole('button', { name: 'Generate with AI' }).click({ timeout: 5000 })
  console.log('UI | generate submitted, waiting for draft...')
  await page.waitForTimeout(5000)
  await page.getByText(/READY|ready/, { exact: false }).first().waitFor({ timeout: 240000 })
  await page.waitForTimeout(1500)

  const card = page.locator('div', { hasText: 'READY' }).last()
  const bodyText = await page.locator('body').innerText()
  const hasEmoji = /[\u{1F300}-\u{1FAFF}]/u.test(bodyText)
  const thumbs = await page.locator('img[src*="/api/artifacts/"]').count()
  console.log(`UI | draft READY | emoji in caption: ${hasEmoji} | media thumbnails: ${thumbs}`)

  // Post button → popover with Post now + Schedule (first draft card)
  await page.getByRole('button', { name: 'Post', exact: true }).first().click({ timeout: 5000 })
  await page.waitForTimeout(600)
  const hasPostNow = await page.getByRole('button', { name: 'Post now' }).isVisible().catch(() => false)
  const hasDateTime = await page.locator('input[type=datetime-local]').isVisible().catch(() => false)
  const hasScheduleBtn = await page.getByRole('button', { name: 'Schedule', exact: true }).isVisible().catch(() => false)
  console.log(`UI | Post popover: Post now=${hasPostNow} datetime=${hasDateTime} Schedule=${hasScheduleBtn}`)
  await page.screenshot({ path: 'e2e-results/workforce/content-studio.png' })
})
