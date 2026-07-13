import { NextResponse } from 'next/server'
export async function GET() {
  let composioError = null
  let imported = false
  try {
    await import('@composio/core')
    imported = true
  } catch (e: any) {
    composioError = e.message
  }
  return NextResponse.json({
    key: process.env.COMPOSIO_API_KEY || null,
    imported,
    composioError
  })
}
