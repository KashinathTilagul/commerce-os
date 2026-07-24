import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { runAgentWork } from '@/lib/agent-worker'

// POST /api/agents/[id]/work — make the agent act on its highest-priority open ticket
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { id } = await params
  const result = await runAgentWork(auth.user.id, id)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
