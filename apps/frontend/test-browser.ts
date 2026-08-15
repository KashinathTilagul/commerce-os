import puppeteer from 'puppeteer-core'
import { chromium } from '@sparticuz/chromium'

async function testApp() {
  console.log('Launching headless browser...')
  
  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
    ],
    headless: 'new',
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })

  console.log('Navigating to http://localhost:3000...')
  const response = await page.goto('http://localhost:3000', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  })

  console.log(`Response status: ${response?.status()}`)
  
  const title = await page.title()
  console.log(`Page title: ${title}`)

  await page.screenshot({ path: '/tmp/ekvaar-homepage.png', fullPage: false })
  console.log('Screenshot saved to /tmp/ekvaar-homepage.png')

  const bodyText = await page.evaluate(() => document.body.innerText)
  console.log(`\nBody text preview (first 500 chars):\n${bodyText.slice(0, 500)}`)

  await browser.close()
  console.log('\nDone.')
}

testApp().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
