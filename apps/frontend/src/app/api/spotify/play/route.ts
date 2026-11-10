export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireSpotifyAccessToken } from '@/lib/spotify-auth'

export async function PUT(req: NextRequest) {
  const auth = await requireSpotifyAccessToken()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const { deviceId, trackUri, playlistUri } = body

    const playBody: Record<string, unknown> = {}
    if (trackUri) playBody.uris = [trackUri]
    else if (playlistUri) playBody.context_uri = playlistUri

    const url = deviceId
      ? `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(String(deviceId))}`
      : 'https://api.spotify.com/v1/me/player/play'

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(playBody),
    })

    if (response.status === 204) {
      return NextResponse.json({ success: true })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json({
        error: 'Spotify API error',
        details: errorData.error?.message || response.statusText,
      }, { status: response.status })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Playback failed', details: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSpotifyAccessToken()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()
    const { deviceId } = body

    const url = deviceId
      ? `https://api.spotify.com/v1/me/player?device_id=${encodeURIComponent(String(deviceId))}`
      : 'https://api.spotify.com/v1/me/player'

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_ids: [deviceId], play: false }),
    })

    if (response.status === 204) {
      return NextResponse.json({ success: true })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json({
        error: 'Spotify API error',
        details: errorData.error?.message || response.statusText,
      }, { status: response.status })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Transfer failed', details: e.message }, { status: 500 })
  }
}
