import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const start = Date.now()
  const storageDir = path.join(process.cwd(), 'storage')

  try {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true })
    }

    const testFile = path.join(storageDir, `.health_check_${Date.now()}.tmp`)
    const testContent = `health_check_${Date.now()}`

    // Test Write
    fs.writeFileSync(testFile, testContent, 'utf-8')

    // Test Read
    const readContent = fs.readFileSync(testFile, 'utf-8')

    // Cleanup
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile)
    }

    const latencyMs = Date.now() - start

    if (readContent === testContent) {
      return NextResponse.json({
        status: 'healthy',
        storage: 'writable',
        path: storageDir,
        latencyMs,
        timestamp: new Date().toISOString(),
      })
    } else {
      return NextResponse.json(
        {
          status: 'unhealthy',
          storage: 'content_mismatch',
          path: storageDir,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        storage: 'error',
        error: error.message || 'Storage write test failed',
        path: storageDir,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
