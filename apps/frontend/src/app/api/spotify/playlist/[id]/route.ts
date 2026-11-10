export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireSpotifyAccessToken } from '@/lib/spotify-auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSpotifyAccessToken()
  if (!auth.success) return auth.response

  const { id } = await params
  if (!/^[A-Za-z0-9]{1,64}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid playlist ID' }, { status: 400 })
  }

  const response = await fetch(`https://api.spotify.com/v1/playlists/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'Failed to fetch playlist' }, { status: response.status })
  }

  return NextResponse.json(await response.json())
}
