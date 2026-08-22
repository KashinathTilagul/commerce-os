// Ponytail check: one runnable walk of every registered desktop app.
// Run: npx playwright test e2e/inspect-apps.spec.ts --project=chromium
import { test } from '@playwright/test'

const APPS = [
  'Health Monitor', 'Memory Explorer', 'Knowledge Drive', 'Command Center',
  'AI Workforce', 'Terminal', 'Settings', 'Notes & Logs', 'Integrations',
  'Product Launches', 'Calculator', 'Notes', 'Calendar', 'Sales & Orders',
  'Finance', 'Inventory & Ops', 'Customers', 'Campaigns', 'Brand Intelligence',
  'AI Infrastructure', 'Risk Center', 'Spotify',
]

test('walk all desktop apps', async ({ page }) => {
  const results: Array<{ app: string; ok: boolean; detail: string }> = []
  test.setTimeout(420000)

  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Username' }).fill('test@gmail.com')
  await page.getByRole('textbox', { name: 'Password' }).fill('EkvaarTest!2026')
  await page.getByRole('button', { name: 'Sign in' }).click()
  try {
    await page.waitForURL('/', { timeout: 10000 })
  } catch {
    await page.goto('/') // login redirect bug workaround
  }
  await page.waitForTimeout(4000) // desktop hydration + boot animation

  const search = page.getByPlaceholder('Search apps…')
  const seenH1s = new Set<string>()

  for (const app of APPS) {
    try {
      // one retry: if the launchpad cell never becomes clickable (overlay stuck),
      // escape out and reopen the launchpad once
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await page.keyboard.press('F4')
          await search.waitFor({ state: 'visible', timeout: 5000 })
          await search.fill(app)
          await page.waitForTimeout(400)
          // scope to launchpad grid cells and match the label div exactly —
          // icon glyphs embed text ("JULY18") and substring matching collides
          // with sibling apps ("Notes" vs "Notes & Logs") and open windows
          const cells = page.locator('div.max-w-5xl div.cursor-pointer')
          const n = await cells.count()
          let target = null as any
          for (let i = 0; i < n; i++) {
            const label = await cells.nth(i).locator('div.text-xs').textContent()
            if ((label || '').trim() === app) { target = cells.nth(i); break }
          }
          if (!target) throw new Error(`no grid cell labeled ${app} (cells: ${n})`)
          await target.click({ timeout: 4000 })
          break
        } catch (e) {
          if (attempt === 1) throw e
          await page.keyboard.press('Escape')
          await page.waitForTimeout(600)
        }
      }
      await page.waitForTimeout(2500)

      const titles = await page.locator('span.font-display').allTextContents()
      const windowTitles = titles.filter((t) => t && t.trim())
      const hasWindow = windowTitles.some(
        (t) => t.trim().toLowerCase() === app.toLowerCase()
      )
      // report an h1 that belongs to THIS app (one not seen from earlier windows)
      const h1s = await page.locator('h1').allTextContents()
      const newH1 = h1s.map((h) => (h || '').trim()).find((h) => h && !seenH1s.has(h))
      for (const h of h1s) if (h?.trim()) seenH1s.add(h.trim())
      const bodyText = await page.locator('body').innerText()
      const hasError =
        /something went wrong|application error|unhandled|failed to load/i.test(
          bodyText
        )
      results.push({
        app,
        ok: hasWindow && !hasError,
        detail: hasWindow
          ? hasError
            ? 'window opened, error text present'
            : `h1: ${(newH1 || '').slice(0, 60)}`
          : `no window (titles: ${windowTitles.join(', ').slice(0, 80) || 'none'})`,
      })
      // visual evidence per app (headless Chromium screenshots work)
      const fs = await import('node:fs')
      fs.mkdirSync('e2e-results/apps', { recursive: true })
      await page.screenshot({
        path: `e2e-results/apps/${app.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`,
      })
    } catch (e: any) {
      results.push({ app, ok: false, detail: 'EXCEPTION: ' + String(e.message).slice(0, 100) })
    }
  }

  console.log('\n=== APP INSPECTION RESULTS ===')
  for (const r of results)
    console.log(`${r.ok ? 'PASS' : 'FAIL'} | ${r.app.padEnd(20)} | ${r.detail}`)
  const failed = results.filter((r) => !r.ok)
  console.log(`=== ${results.length - failed.length}/${results.length} apps OK ===\n`)
})
