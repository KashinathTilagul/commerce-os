export const dynamic = 'force-dynamic'
export const maxDuration = 60
import { NextRequest, NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/cron-auth'
import { runAgentSweep } from '@/lib/agent-scheduler'

// Cron entry point for the agent sweep (replaces the in-process timer on Vercel).
export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const ran = await runAgentSweep()
  return NextResponse.json({ ran: ran === true })
}

// Vercel Cron issues GET requests.
export const GET = POST
