// AI Workforce deep inspection — stage 1: walk all sections + agent workspace tabs,
// inventory buttons, screenshot each view.
import { test } from '@playwright/test'
import { mkdirSync, existsSync } from 'node:fs'

const SECTIONS = ['Overview', 'Agents', 'Org Chart', 'Issues', 'Approvals', 'Activity', 'Costs', 'Settings']
const SHOT_DIR = 'e2e-results/workforce'
const AUTH_STATE = '.auth/state.json'

// login is rate-limited (429 after ~5 attempts/2min) — cache the session
const hasState = existsSync(AUTH_STATE)
test.use({ storageState: hasState ? AUTH_STATE : undefined })

test('workforce section walk', async ({ page }) => {
  test.setTimeout(300000)
  await page.goto('/')
  if (page.url().includes('/login')) {
    await page.getByRole('textbox', { name: 'Username' }).fill('test@gmail.com')
    await page.getByRole('textbox', { name: 'Password' }).fill('EkvaarTest!2026')
    await page.getByRole('button', { name: 'Sign in' }).click()
    try { await page.waitForURL('/', { timeout: 8000 }) } catch { await page.goto('/') }
    mkdirSync('.auth', { recursive: true })
    await page.context().storageState({ path: AUTH_STATE })
  }
  await page.waitForTimeout(4000)

  // open AI Workforce from the DOCK — the launchpad overlay never unmounts
  // after use (known bug) and would block every subsequent click.
  // Dock icons have no text (label is a hover tooltip), so hover icons in the
  // bottom dock strip until the AI Workforce tooltip appears, then click.
  // wake the dock (auto-hides until pointer activity). Default dock order is
  // [launchpad, command, agents, sales, inventory, integrations, settings] —
  // AI Workforce ('agents') is the 3rd icon, so sort dock icons by x and
  // click index 2 (deterministic, no tooltip race).
  await page.mouse.move(640, 690)
  await page.waitForTimeout(1000)
  const dockButtons = page.locator('div[role="button"]')
  const dn = await dockButtons.count()
  const dockIcons: Array<{ x: number; i: number }> = []
  for (let i = 0; i < dn; i++) {
    const box = await dockButtons.nth(i).boundingBox()
    if (box && box.y > 500 && box.height <= 90) dockIcons.push({ x: box.x, i })
  }
  dockIcons.sort((a, b) => a.x - b.x)
  console.log(`DBG dock candidates: ${dn}, icons in strip: ${dockIcons.length}`)
  if (dockIcons.length < 3) throw new Error(`dock icons found: ${dockIcons.length}`)
  await dockButtons.nth(dockIcons[2].i).click()
  await page.locator('span.font-display', { hasText: 'AI Workforce' }).first().waitFor({ timeout: 10000 })
  await page.waitForTimeout(2500)

  mkdirSync(SHOT_DIR, { recursive: true })
  const bodyText = await page.locator('body').innerText()
  const hasError = /something went wrong|application error|unhandled/i.test(bodyText)
  console.log(`WORKFORCE | window opened | boot error: ${hasError}`)

  for (const section of SECTIONS) {
    try {
      await page.getByRole('button', { name: new RegExp(`^${section}`) }).first().click({ timeout: 5000 })
      await page.waitForTimeout(2500)
      const headings = await page.locator('h1, h2, h3').allTextContents()
      const buttons = await page.locator('button:visible').allTextContents()
      const cleanButtons = buttons.map((b) => b.trim()).filter((b) => b && b.length < 40)
      const uniq = [...new Set(cleanButtons)]
      const err = /something went wrong|application error|unhandled/i.test(await page.locator('body').innerText())
      await page.screenshot({ path: `${SHOT_DIR}/section-${section.replace(/\s+/g, '-').toLowerCase()}.png` })
      console.log(`SECTION | ${section} | error=${err} | headings=${JSON.stringify(headings.filter(Boolean).slice(0, 3))} | buttons(${uniq.length}): ${uniq.join(' · ').slice(0, 300)}`)
    } catch (e: any) {
      console.log(`SECTION | ${section} | FAIL | ${String(e.message).slice(0, 90)}`)
    }
  }

  // Agent workspace: go to Agents, open first agent card, walk workspace tabs
  try {
    await page.getByRole('button', { name: 'Agents', exact: true }).first().click({ timeout: 5000 })
    await page.waitForTimeout(2000)
    const agentCards = page.locator('[data-agent-id], .group.cursor-pointer, div[class*=agent-card]')
    // fallback: click the first clickable agent tile — try cards with an h3/h4 name
    const card = page.locator('div.cursor-pointer, [role=button]').filter({ hasText: /(Diya|Priya|Zara|Kael|Dhruv|Vega|Kavya|Aarav|Riya|Neil)/ }).first()
    await card.click({ timeout: 6000 })
    await page.waitForTimeout(2500)
    await page.screenshot({ path: `${SHOT_DIR}/agent-workspace.png` })
    const wsHeadings = await page.locator('h1, h2, h3').allTextContents()
    console.log(`WORKSPACE | opened | headings=${JSON.stringify(wsHeadings.filter(Boolean).slice(0, 4))}`)

    const tabNames = await page.locator('[role=tab], button[class*=tab]').allTextContents()
    console.log(`WORKSPACE | tabs found: ${JSON.stringify(tabNames.map((t) => t.trim()).filter(Boolean))}`)
    for (const t of tabNames.map((t) => t.trim()).filter(Boolean)) {
      try {
        await page.locator('[role=tab], button[class*=tab]').filter({ hasText: t }).first().click({ timeout: 4000 })
        await page.waitForTimeout(1800)
        const err = /something went wrong|application error|unhandled/i.test(await page.locator('body').innerText())
        const tb = [...new Set((await page.locator('button:visible').allTextContents()).map((b) => b.trim()).filter((b) => b && b.length < 40))]
        await page.screenshot({ path: `${SHOT_DIR}/workspace-tab-${t.replace(/\s+/g, '-').toLowerCase()}.png` })
        console.log(`TAB | ${t} | error=${err} | buttons(${tb.length}): ${tb.join(' · ').slice(0, 250)}`)
      } catch (e: any) {
        console.log(`TAB | ${t} | FAIL | ${String(e.message).slice(0, 80)}`)
      }
    }
  } catch (e: any) {
    console.log(`WORKSPACE | FAIL | ${String(e.message).slice(0, 100)}`)
  }
})
