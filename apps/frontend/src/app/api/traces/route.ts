import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getTraces } from '@/lib/langfuse'
import { createApiError } from '@/lib/security'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(request.url)
  const agentCode = searchParams.get('agentCode') || undefined
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  try {
    const traces = await getTraces(auth.user.id, { agentCode, limit })
    return NextResponse.json(traces)
  } catch (error: any) {
    return createApiError(error.message, 500)
  }
}
