export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireAuth } from '@/lib/auth-guard'

export async function POST() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const cookieStore = await cookies()
  cookieStore.delete('spotify_access_token')
  cookieStore.delete('spotify_refresh_token')
  cookieStore.delete('spotify_scope')
  cookieStore.delete('spotify_owner')
  return NextResponse.json({ success: true })
}
