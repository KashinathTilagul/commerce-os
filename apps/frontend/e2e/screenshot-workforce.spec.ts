import { test } from '@playwright/test'
import { existsSync } from 'node:fs'

const AUTH_STATE = '.auth/state.json'
if (existsSync(AUTH_STATE)) test.use({ storageState: AUTH_STATE })

test('workforce redesign screenshots', async ({ page }) => {
  test.setTimeout(180000)
  await page.goto('/')
  await page.waitForTimeout(4000)
  await page.mouse.move(640, 690)
  await page.waitForTimeout(800)
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
  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'e2e-results/workforce/redesign-overview.png' })
  console.log('SHOT overview saved')

  // agent workspace with new tab bar
  await page.getByRole('button', { name: /^Agents/ }).first().click({ timeout: 5000 })
  await page.waitForTimeout(1500)
  const card = page.locator('div.cursor-pointer, [class*=cursor-pointer]').filter({ hasText: /(Vega|Diya|Priya)/ }).first()
  await card.click({ timeout: 6000 })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: 'e2e-results/workforce/redesign-workspace.png' })
  console.log('SHOT workspace saved')
})
