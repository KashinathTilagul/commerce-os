import { NextRequest, NextResponse } from 'next/server'
import { getToolsForToolkit } from '@/lib/composio-service'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ toolkit: string }> }
) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  
  const { toolkit } = await params
  const tools = getToolsForToolkit(toolkit)
  return NextResponse.json({ tools })
}
