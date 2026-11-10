export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireSpotifyAccessToken } from '@/lib/spotify-auth'

export async function GET(req: NextRequest) {
  const auth = await requireSpotifyAccessToken()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  const type = searchParams.get('type') || 'track,album,artist,playlist'

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}&limit=10`,
      { headers: { Authorization: `Bearer ${auth.token}` } }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json({
        error: 'Spotify API error',
        details: errorData.error?.message || response.statusText,
      }, { status: response.status })
    }

    return NextResponse.json(await response.json())
  } catch (e: any) {
    return NextResponse.json({ error: 'Search failed', details: e.message }, { status: 500 })
  }
}
