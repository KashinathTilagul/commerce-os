export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireSpotifyAccessToken } from '@/lib/spotify-auth'

export async function GET() {
  const auth = await requireSpotifyAccessToken()
  if (!auth.success) return auth.response

  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${auth.token}` },
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: response.status })
  }

  return NextResponse.json(await response.json())
}
