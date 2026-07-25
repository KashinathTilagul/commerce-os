import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'

export async function POST() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  return NextResponse.json({ status: 'success', assessment: {} })
}
