// PDF Generator using Puppeteer
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { renderTemplate } from './template-engine'
import { storeArtifact, initializeStorage } from './storage'
import { db } from './db'
import { createHash } from 'node:crypto'

export interface PDFGenerationOptions {
  template: string
  data: Record<string, any>
  title: string
  organizationId: string
  generatedBy?: string
}

export async function generatePDF(options: PDFGenerationOptions): Promise<{ artifactId: string; downloadUrl: string }> {
  await initializeStorage()
  
  // Render HTML from template
  const html = renderTemplate(options.template, options.data)
  
  // Launch browser
  let browser
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  } catch (error) {
    // Fallback to system Chrome if available
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROME_BIN || process.env.PUPPETEER_EXECUTABLE_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/chromium')
    })
  }
  
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  
  // Generate PDF
  const pdfBuffer = await page.pdf({
    format: 'A4',
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    },
    printBackground: true
  })
  
  await browser.close()
  
  // Store artifact
  const artifactId = `PDF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const metadata = await storeArtifact(artifactId, 'PDF', Buffer.from(pdfBuffer), `${options.title}.pdf`)
  
  // Create database record
  const artifact = await db.artifact.create({
    data: {
      id: artifactId,
      organizationId: options.organizationId,
      title: options.title,
      type: 'PDF',
      mimeType: 'application/pdf',
      storageLocation: metadata.path,
      status: 'READY',
      generatedBy: options.generatedBy,
      contentHash: createHash('sha256').update(pdfBuffer).digest('hex'),
      byteSize: pdfBuffer.length,
      parameters: JSON.stringify({ template: options.template, data: options.data })
    }
  })
  
  return {
    artifactId: artifact.id,
    downloadUrl: `/api/artifacts/${artifact.id}`
  }
}

export async function getPDF(artifactId: string): Promise<Buffer | null> {
  const { getArtifact } = await import('./storage')
  return getArtifact(artifactId, 'PDF')
}
