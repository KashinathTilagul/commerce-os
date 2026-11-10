export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireSpotifyAccessToken } from '@/lib/spotify-auth'

export async function GET() {
  const auth = await requireSpotifyAccessToken()
  if (!auth.success) return auth.response

  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json({
        error: 'Spotify API error',
        details: errorData.error?.message || response.statusText,
      }, { status: response.status })
    }

    return NextResponse.json(await response.json())
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch devices', details: e.message }, { status: 500 })
  }
}
