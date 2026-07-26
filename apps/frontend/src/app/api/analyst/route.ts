import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { sanitizeInput } from '@/lib/security'
import { analyze } from '@/lib/analyst'

// POST /api/analyst — plan-then-execute: compute an answer from real DB rows.
export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const { question } = await req.json()
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'question required' }, { status: 400 })
    }
    const result = await analyze(auth.organizationId, sanitizeInput(question, { maxLength: 500 }))
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: 'Analysis failed', detail: e?.message || String(e) }, { status: 500 })
  }
}
