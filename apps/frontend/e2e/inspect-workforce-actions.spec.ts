// AI Workforce interactive test — click each feature button and verify outcome.
import { test } from '@playwright/test'
import { mkdirSync, existsSync } from 'node:fs'

const AUTH_STATE = '.auth/state.json'
const SHOT_DIR = 'e2e-results/workforce'
const hasState = existsSync(AUTH_STATE)
test.use({ storageState: hasState ? AUTH_STATE : undefined })

async function openWorkforceViaDock(page: any) {
  await page.goto('/')
  await page.waitForTimeout(4000)
  await page.mouse.move(640, 690)
  await page.waitForTimeout(1000)
  const dockButtons = page.locator('div[role="button"]')
  const dn = await dockButtons.count()
  const icons: Array<{ x: number; i: number }> = []
  for (let i = 0; i < dn; i++) {
    const box = await dockButtons.nth(i).boundingBox()
    if (box && box.y > 500 && box.height <= 90) icons.push({ x: box.x, i })
  }
  icons.sort((a, b) => a.x - b.x)
  await dockButtons.nth(icons[2].i).click()
  await page.locator('span.font-display', { hasText: 'AI Workforce' }).first().waitFor({ timeout: 10000 })
  await page.waitForTimeout(2000)
}

test('workforce interactive buttons', async ({ page }) => {
  test.setTimeout(420000)
  mkdirSync(SHOT_DIR, { recursive: true })
  const log = (k: string, ok: boolean, detail: string) => console.log(`${ok ? 'PASS' : 'FAIL'} | ${k} | ${detail}`)
  await openWorkforceViaDock(page)

  // ── Overview: Founder Inbox + Assign work dialog ──────────────────────────
  try {
    await page.getByRole('button', { name: 'Founder Inbox' }).click({ timeout: 5000 })
    await page.waitForTimeout(1500)
    const txt = await page.locator('body').innerText()
    log('Overview / Founder Inbox', /inbox|pending|approve/i.test(txt), 'inbox content shown')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  } catch (e: any) { log('Overview / Founder Inbox', false, String(e.message).slice(0, 80)) }

  try {
    // Assign work is disabled until the brief has 10+ chars (by design)
    await page.getByRole('button', { name: /^Overview/ }).first().click({ timeout: 5000 })
    await page.waitForTimeout(1000)
    await page.getByPlaceholder(/Ask anything: current revenue/).fill('Write a launch note for the red sneaker and queue a hero image for it.')
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Assign work' }).click({ timeout: 5000 })
    await page.waitForTimeout(1500)
    const txt = await page.locator('body').innerText()
    const opened = /what do you need|brief|describe|assign/i.test(txt)
    await page.screenshot({ path: `${SHOT_DIR}/action-assign-work.png` })
    log('Overview / Assign work', opened, 'assignment dialog opened')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(600)
  } catch (e: any) { log('Overview / Assign work', false, String(e.message).slice(0, 80)) }

  // ── Agents: status filters ────────────────────────────────────────────────
  await page.getByRole('button', { name: /^Agents/ }).first().click({ timeout: 5000 })
  await page.waitForTimeout(1500)
  for (const f of ['Active', 'Paused', 'Error', 'All 65']) {
    try {
      await page.getByRole('button', { name: new RegExp(`^${f}`) }).first().click({ timeout: 4000 })
      await page.waitForTimeout(800)
      const err = /something went wrong|application error/i.test(await page.locator('body').innerText())
      log(`Agents / filter ${f}`, !err, 'filter applied')
    } catch (e: any) { log(`Agents / filter ${f}`, false, String(e.message).slice(0, 60)) }
  }

  // ── Agent workspace: tabs + Run Heartbeat ────────────────────────────────
  try {
    const card = page.locator('div.cursor-pointer, [class*=cursor-pointer]').filter({ hasText: /(Vega|Diya|Priya|Zara|Kael|Dhruv|Kavya)/ }).first()
    await card.click({ timeout: 6000 })
    await page.waitForTimeout(2000)
    // Marketing Automation tab only exists for MARKETING-department agents
    const tabButtons = await page.locator('button', { hasText: 'Marketing Automation' }).count()
    const tabs = ['Dashboard', 'Instructions', 'Skills', 'Configuration', 'Runs', 'Budget', 'References',
                  ...(tabButtons > 0 ? ['Marketing Automation'] : [])]
    for (const t of tabs) {
      try {
        await page.getByRole('button', { name: t, exact: true }).click({ timeout: 3000 })
        await page.waitForTimeout(1200)
        const err = /something went wrong|application error/i.test(await page.locator('body').innerText())
        log(`Workspace / ${t} tab`, !err, 'rendered')
        await page.screenshot({ path: `${SHOT_DIR}/action-tab-${t.replace(/\s+/g, '-').toLowerCase()}.png` })
      } catch (e: any) { log(`Workspace / ${t} tab`, false, String(e.message).slice(0, 60)) }
    }
    // Run Heartbeat — real agent work through the gateway
    try {
      await page.getByRole('button', { name: 'Run Heartbeat' }).click({ timeout: 5000 })
      await page.waitForTimeout(12000)
      const txt = await page.locator('body').innerText()
      const worked = /worked|IN_REVIEW|COMPLETED|run/i.test(txt)
      log('Workspace / Run Heartbeat', worked, 'heartbeat run triggered')
      await page.screenshot({ path: `${SHOT_DIR}/action-run-heartbeat.png` })
    } catch (e: any) { log('Workspace / Run Heartbeat', false, String(e.message).slice(0, 60)) }
  } catch (e: any) { log('Workspace / open agent', false, String(e.message).slice(0, 80)) }

  // ── Issues: Create Issue ──────────────────────────────────────────────────
  await page.getByRole('button', { name: /^Issues/ }).first().click({ timeout: 5000 })
  await page.waitForTimeout(1500)
  try {
    await page.getByRole('button', { name: 'Create Issue' }).click({ timeout: 5000 })
    await page.waitForTimeout(1200)
    const dlg = page.locator('input, textarea').first()
    const hasForm = (await page.locator('input:visible, textarea:visible').count()) > 0
    if (hasForm) {
      await page.locator('input:visible').first().fill('Inspection test issue — safe to close')
      await page.screenshot({ path: `${SHOT_DIR}/action-create-issue.png` })
    }
    log('Issues / Create Issue dialog', hasForm, hasForm ? 'form opened' : 'no form')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  } catch (e: any) { log('Issues / Create Issue dialog', false, String(e.message).slice(0, 60)) }

  // ── Approvals: approve the top pending item ───────────────────────────────
  await page.getByRole('button', { name: /^Approvals/ }).first().click({ timeout: 5000 })
  await page.waitForTimeout(1500)
  try {
    await page.getByRole('button', { name: 'PENDING', exact: true }).click({ timeout: 4000 })
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${SHOT_DIR}/action-approvals.png` })
    log('Approvals / PENDING filter', true, 'filter applied')
  } catch (e: any) { log('Approvals / PENDING filter', false, String(e.message).slice(0, 60)) }
  try {
    await page.getByRole('button', { name: 'Approve', exact: true }).first().click({ timeout: 5000 })
    await page.waitForTimeout(2500)
    const txt = await page.locator('body').innerText()
    log('Approvals / Approve', /approved/i.test(txt), 'approval action recorded')
    await page.screenshot({ path: `${SHOT_DIR}/action-approve.png`, fullPage: false })
  } catch (e: any) { log('Approvals / Approve', false, String(e.message).slice(0, 60)) }

  // ── Settings: Save ────────────────────────────────────────────────────────
  await page.getByRole('button', { name: /^Settings/ }).first().first().click({ timeout: 5000 })
  await page.waitForTimeout(1500)
  try {
    await page.getByRole('button', { name: 'Save Settings' }).click({ timeout: 5000 })
    await page.waitForTimeout(1500)
    const err = /something went wrong|application error/i.test(await page.locator('body').innerText())
    log('Settings / Save Settings', !err, 'save attempted without error')
  } catch (e: any) { log('Settings / Save Settings', false, String(e.message).slice(0, 60)) }
})
