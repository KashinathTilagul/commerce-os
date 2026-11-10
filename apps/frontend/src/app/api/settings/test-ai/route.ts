export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireOrgAdmin } from '@/lib/auth-guard'
import { routeText } from '@/lib/ai-router'

export async function POST() {
  const auth = await requireOrgAdmin()
  if (!auth.success) return auth.response

  try {
    const result = await routeText('fast', auth.organizationId, {
      system: 'Reply with OK.',
      prompt: 'Reply with OK.',
      temperature: 0,
      maxOutputTokens: 16,
    })
    return NextResponse.json({
      ok: true,
      provider: result.provider,
      model: result.model,
      reply: result.text.trim(),
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'AI provider test failed' },
      { status: 422 }
    )
  }
}
