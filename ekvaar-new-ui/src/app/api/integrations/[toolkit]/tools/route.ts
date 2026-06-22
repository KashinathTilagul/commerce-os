import { NextRequest, NextResponse } from 'next/server'
import { getToolsForToolkit } from '@/lib/composio-service'

// GET /api/integrations/[toolkit]/tools — list available tools for a toolkit
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ toolkit: string }> }
) {
  const { toolkit } = await params
  const tools = getToolsForToolkit(toolkit)
  return NextResponse.json({ tools })
}
